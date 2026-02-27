import { hash } from '@bronti/bcrypt'
import { Hono } from '@hono/hono'
import { serveStatic } from '@hono/hono/deno'
import type { ContentfulStatusCode } from '@hono/hono/utils/http-status'
import { BlobReader, BlobWriter, Uint8ArrayReader, ZipReader, ZipWriter } from '@zip-js/zip-js'
import { z } from '@zod/zod'
import {
  clearSessionCookie,
  getSessionByToken,
  getSessionToken,
  requireSession,
  sessionFromUser,
  setSessionCookie,
} from './auth.ts'
import { sendEmail } from './email.ts'
import {
  ADMIN_EMAILS,
  corsHeaders,
  errorResponse,
  formatApacheLog,
  jsonError,
  logError,
  validatePassword,
  zodErrorMessage,
} from './helpers.ts'
import { newId } from './id.ts'
import { getKv, k, restoreProject, updateCommentArtistNames, updateProject } from './kv.ts'
import { runMigrations } from './migrations.ts'
import { generateAITrack, generateSimilarTrack, modifyAITrack } from './openai.ts'
import {
  AuthLoginRequestSchema,
  AuthRegisterRequestSchema,
  type Comment,
  CommentRequestSchema,
  CommentSchema,
  CreateProjectRequestSchema,
  GenerateSimilarTrackRequestSchema,
  GenerateSimilarTrackResponseSchema,
  GenerateTrackRequestSchema,
  GenerateTrackResponseSchema,
  HealthResponseSchema,
  type Like,
  ModifyTrackRequestSchema,
  ModifyTrackResponseSchema,
  OkResponseSchema,
  type OneLiner,
  OneLinerRequestSchema,
  OneLinerSchema,
  OneLinersSchema,
  type Project,
  ProjectSchema,
  ProjectsSchema,
  SessionSchema,
  UpdateArtistNameRequestSchema,
  UpdateProjectRequestSchema,
  type User,
  UserSchema,
  UsersSchema,
} from './types.ts'

const app = new Hono()

// Endpoints
app.onError((err, c) => {
  const message = err.message || 'Internal server error'
  logError(message, 500, { path: c.req.path, method: c.req.method })
  if (err.stack) console.error(err.stack)
  const error = jsonError('Internal server error', 500)
  return c.json(error.body, error.status)
})

// Middleware: CORS and COOP/COEP on all responses (after handler runs)
app.use('*', async (c, next) => {
  try {
    await next()
    const headers = corsHeaders(c.req.header('Origin') ?? undefined)
    for (const [k, v] of Object.entries(headers)) {
      c.res.headers.set(k, v)
    }
  }
  catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const stack = e instanceof Error ? e.stack : undefined
    logError(`Middleware error: ${message}`, 500, { path: c.req.path, method: c.req.method })
    if (stack) console.error(stack)
    throw e
  }
})

app.options('*', c => c.body(null, 204))

// Static
app.use('/*', async (c, next) => {
  if (c.req.path.startsWith('/api/')) {
    await next()
    return
  }
  return serveStatic({ root: './dist' })(c, next)
})

// Health
app.get('/api/health', c => {
  return c.json(HealthResponseSchema.parse({ status: 'ok' }), 200)
})

// Session
app.get('/api/session', async c => {
  const { session } = await requireSession(c)
  if (!session) {
    return errorResponse(c, 'Not authenticated', 401)
  }
  return c.json(SessionSchema.parse(session), 200)
})

// Auth
app.post('/api/auth/register', async c => {
  const kv = await getKv()
  const raw = await c.req.json().catch(() => null)
  if (raw === null) {
    return errorResponse(c, 'Invalid JSON', 400)
  }
  const parsed = AuthRegisterRequestSchema.safeParse(raw)
  if (!parsed.success) {
    return errorResponse(c, zodErrorMessage(parsed.error), 400)
  }

  const artistName = parsed.data.artistName.trim()
  const email = parsed.data.email.trim().toLowerCase()
  const password = parsed.data.password
  const pw = hash(password)
  for (let i = 0; i < 5; i++) {
    const userId = newId()
    const token = newId()
    const user: User = {
      id: userId,
      artistName,
      email,
      passwordHash: pw,
      sentWelcomeEmail: false,
      sentBetaEmail: false,
      projects: [],
      likes: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const session = sessionFromUser(token, user)

    const commit = await kv.atomic()
      .check({ key: k.userByEmail(email), versionstamp: null })
      .check({ key: k.user(userId), versionstamp: null })
      .check({ key: k.session(token), versionstamp: null })
      .set(k.user(userId), user)
      .set(k.userByEmail(email), userId)
      .set(k.session(token), session)
      .set(k.sessionByUserId(userId), token)
      .commit()

    if (!commit.ok) {
      const existing = (await kv.get<string>(k.userByEmail(email))).value ?? null
      if (existing) {
        return errorResponse(c, 'Email is already registered', 409)
      }
      continue
    }

    setSessionCookie(c, token)
    return c.json(SessionSchema.parse(session), 201)
  }

  return errorResponse(c, 'Failed to register', 500)
})

app.post('/api/auth/login', async c => {
  try {
    const kv = await getKv()
    const raw = await c.req.json().catch(() => null)
    if (raw === null) {
      return errorResponse(c, 'Invalid JSON', 400)
    }
    const parsed = AuthLoginRequestSchema.safeParse(raw)
    if (!parsed.success) {
      return errorResponse(c, zodErrorMessage(parsed.error), 400)
    }

    const email = parsed.data.email.trim().toLowerCase()
    const password = parsed.data.password

    const userIdEntry = await kv.get<string>(k.userByEmail(email))
    const userId = userIdEntry.value ?? null
    if (!userId) {
      return errorResponse(c, 'Invalid email or password', 401)
    }

    const userEntry = await kv.get<User>(k.user(userId))
    const user = userEntry.value ?? null
    if (!user) {
      return errorResponse(c, 'Invalid email or password', 401)
    }

    const ok = await validatePassword(password, user.passwordHash)
    if (!ok) {
      return errorResponse(c, 'Invalid email or password', 401)
    }

    const needsBcryptUpgrade = !user.passwordHash.startsWith('$2')
    if (needsBcryptUpgrade) {
      const newHash = hash(password)
      await kv.set(k.user(userId), { ...user, passwordHash: newHash })
    }

    const prevTokenEntry = await kv.get<string>(k.sessionByUserId(userId))
    const prevToken = prevTokenEntry.value ?? null

    const session = sessionFromUser('x', user)

    for (let i = 0; i < 5; i++) {
      const token = newId()
      const a = kv.atomic().check({ key: k.session(token), versionstamp: null })
      if (prevToken) a.delete(k.session(prevToken))
      session.id = token
      a.set(k.session(token), session)
      a.set(k.sessionByUserId(userId), token)
      const commit = await a.commit()
      if (!commit.ok) continue

      setSessionCookie(c, token)
      return c.json(SessionSchema.parse(session), 200)
    }

    return errorResponse(c, 'Failed to login', 500)
  }
  catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const stack = e instanceof Error ? e.stack : undefined
    logError(`Login error: ${message}`, 500, { path: c.req.path, method: c.req.method })
    if (stack) console.error(stack)
    return errorResponse(c, 'Internal server error', 500)
  }
})

app.post('/api/auth/logout', async c => {
  const kv = await getKv()
  const token = getSessionToken(c)
  if (token) {
    const session = await getSessionByToken(token)
    const a = kv.atomic().delete(k.session(token))
    if (session) a.delete(k.sessionByUserId(session.userId))
    await a.commit()
  }
  clearSessionCookie(c)
  return c.json(OkResponseSchema.parse({ ok: true }), 200)
})

// Profile
app.get('/api/avatar/:userId', async c => {
  const userId = c.req.param('userId')
  const kv = await getKv()
  const imageBuffer = await kv.get<Uint8Array>(k.avatar(userId))
  if (!imageBuffer.value) {
    return errorResponse(c, 'Avatar not found', 404)
  }
  return c.body(imageBuffer.value as Uint8Array<ArrayBuffer>)
})

app.post('/api/avatar', async c => {
  const { session } = await requireSession(c)
  if (!session) {
    return errorResponse(c, 'Not authenticated', 401)
  }
  const json = await c.req.json().catch(() => null)
  if (json === null) {
    return errorResponse(c, 'Invalid JSON', 400)
  }
  const imageBuffer = Uint8Array.from(atob(json.image), char => char.charCodeAt(0))
  const userId = session.userId
  const kv = await getKv()

  const commit = await kv.atomic()
    .set(k.avatar(userId), imageBuffer)
    .commit()

  if (!commit.ok) {
    return errorResponse(c, 'Failed to upload avatar', 500)
  }

  return c.json(OkResponseSchema.parse({ ok: true }), 200)
})

app.put('/api/artist-name', async c => {
  const { session } = await requireSession(c)
  if (!session) {
    return errorResponse(c, 'Not authenticated', 401)
  }
  const json = await c.req.json().catch(() => null)
  if (json === null) {
    return errorResponse(c, 'Invalid JSON', 400)
  }
  const parsed = UpdateArtistNameRequestSchema.safeParse(json)
  if (!parsed.success) {
    return errorResponse(c, zodErrorMessage(parsed.error), 400)
  }

  const kv = await getKv()

  const user = await kv.get<User>(k.user(session.userId))
  if (!user.value) {
    return errorResponse(c, 'User not found', 404)
  }

  user.value.artistName = parsed.data.artistName
  session.artistName = parsed.data.artistName

  const commit = await kv.atomic()
    .set(k.user(session.userId), user.value)
    .set(k.session(session.id), session)
    .commit()

  if (!commit.ok) {
    throw new Error('Failed to update artist name')
  }

  await updateCommentArtistNames(session.userId, parsed.data.artistName)

  return c.json(OkResponseSchema.parse({ ok: true }), 200)
})

// Projects
app.get('/api/projects', async c => {
  const { session } = await requireSession(c)
  if (!session) {
    return errorResponse(c, 'Not authenticated', 401)
  }
  const userId = session.userId
  const kv = await getKv()
  const projects = kv.list({ prefix: k.projectsByUserId(userId) })
  const values = await Array.fromAsync(projects)
  return c.json(ProjectsSchema.parse(values.map(v => v.value).filter(Boolean)), 200)
})

app.post('/api/projects', async c => {
  const { session } = await requireSession(c)
  if (!session) {
    return errorResponse(c, 'Not authenticated', 401)
  }

  const kv = await getKv()
  const raw = await c.req.json().catch(() => null)
  if (raw === null) {
    return errorResponse(c, 'Invalid JSON', 400)
  }
  const parsed = CreateProjectRequestSchema.safeParse(raw)
  if (!parsed.success) {
    return errorResponse(c, zodErrorMessage(parsed.error), 400)
  }

  let remixOfEntry: Deno.KvEntryMaybe<Project> | null = null
  if (parsed.data.remixOfId) {
    remixOfEntry = await kv.get<Project>(k.project(parsed.data.remixOfId))
    if (!remixOfEntry.value) {
      return errorResponse(c, 'Remix of project not found', 404)
    }
  }

  const user = await kv.get<User>(k.user(session.userId))
  if (!user.value) {
    return errorResponse(c, 'User not found', 404)
  }

  const isPublic = parsed.data.isPublic ?? false

  for (let i = 0; i < 5; i++) {
    const now = Date.now()
    const project: Project = {
      id: newId(),
      name: parsed.data.name,
      code: parsed.data.code,
      userId: session.userId,
      artistName: session.artistName,
      likes: [],
      comments: [],
      remixes: [],
      remixOf: remixOfEntry?.value ?? undefined,
      isPublic,
      createdAt: now,
      updatedAt: now,
    }

    const commit = await kv.atomic()
      .check({ key: k.project(project.id), versionstamp: null })
      .set(k.project(project.id), project)
      .set(k.projectByUserId(session.userId, project.id), project)
      .commit()

    if (!commit.ok) {
      continue
    }

    if (remixOfEntry?.value) {
      const remixOfProject = remixOfEntry.value
      const commit = await kv.atomic()
        .check({ key: k.project(remixOfProject.id), versionstamp: remixOfEntry.versionstamp })
        .set(k.project(remixOfProject.id), { ...remixOfProject, remixes: [...remixOfProject.remixes, project] })
        .commit()

      if (!commit.ok) {
        throw new Error('Failed to update remix of project')
      }
    }

    if (isPublic) {
      const commit = await kv.atomic()
        .check({ key: k.publicProject(project.id), versionstamp: null })
        .set(k.publicProject(project.id), project)
        .set(k.publicProjectByUserId(session.userId, project.id), project)
        .set(k.publicProjectByTimestamp(project.createdAt), project)
        .commit()

      if (!commit.ok) {
        throw new Error('Failed to update public project')
      }
    }

    await kv.set(k.user(session.userId), { ...user.value, projects: [...(user.value.projects ?? []), project.id] })
    if (!commit.ok) {
      throw new Error('Failed to update user')
    }

    return c.json(ProjectSchema.parse(project), 201)
  }
  return errorResponse(c, 'Failed to create project', 500)
})

app.get('/api/projects/:id', async c => {
  const kv = await getKv()
  const id = c.req.param('id')
  const project = await kv.get<Project>(k.project(id))
  if (!project.value) {
    return errorResponse(c, 'Project not found', 404)
  }
  return c.json(ProjectSchema.parse(project.value), 200)
})

app.put('/api/projects/:id', async c => {
  const { session } = await requireSession(c)
  if (!session) {
    return errorResponse(c, 'Not authenticated', 401)
  }

  const kv = await getKv()

  const id = c.req.param('id')
  const project = await kv.get<Project>(k.project(id))
  if (!project.value) {
    return errorResponse(c, 'Project not found', 404)
  }
  if (project.value.userId !== session.userId) {
    return errorResponse(c, 'Not authorized', 403)
  }

  const raw = await c.req.json().catch(() => null)
  if (raw === null) {
    return errorResponse(c, 'Invalid JSON', 400)
  }
  const parsed = UpdateProjectRequestSchema.safeParse(raw)
  if (!parsed.success) {
    return errorResponse(c, zodErrorMessage(parsed.error), 400)
  }

  let remixOf: Deno.KvEntryMaybe<Project> | null = null
  if (parsed.data.remixOfId) {
    remixOf = await kv.get<Project>(k.project(parsed.data.remixOfId))
    if (!remixOf.value) {
      return errorResponse(c, 'Remix of project not found', 404)
    }
  }

  const isPublic = parsed.data.isPublic ?? false

  const updatedProject: Project = { ...project.value, ...parsed.data, updatedAt: Date.now() }
  const commit = await kv.atomic()
    .check({ key: k.project(updatedProject.id), versionstamp: project.versionstamp })
    .set(k.project(updatedProject.id), updatedProject)
    .set(k.projectByUserId(session.userId, updatedProject.id), updatedProject)
    .commit()

  if (!commit.ok) {
    throw new Error('Failed to update project')
  }

  if (remixOf) {
    const remixOfProject = remixOf.value
    const index = remixOfProject.remixes.findIndex(r => r.id === updatedProject.id)
    if (index !== -1) {
      remixOfProject.remixes[index] = updatedProject
    }
    else {
      remixOfProject.remixes.push(updatedProject)
    }
    const commit = await kv.atomic()
      .check({ key: k.project(remixOfProject.id), versionstamp: remixOf.versionstamp })
      .set(k.project(remixOfProject.id), remixOfProject)
      .commit()

    if (!commit.ok) {
      throw new Error('Failed to update remix of project')
    }
  }

  // if the updated project is public
  if (isPublic) {
    const publicEntry = await kv.get(k.publicProject(updatedProject.id))

    const commit = await kv.atomic()
      .check({ key: k.publicProject(updatedProject.id), versionstamp: publicEntry.versionstamp })
      .set(k.publicProject(updatedProject.id), updatedProject)
      .set(k.publicProjectByUserId(session.userId, updatedProject.id), updatedProject)
      .commit()

    if (!commit.ok) {
      throw new Error('Failed to update public project')
    }

    // if the project was public
    if (project.value.isPublic) {
      const commit = await kv.atomic()
        .delete(k.publicProjectByTimestamp(project.value.updatedAt))
        .set(k.publicProjectByTimestamp(updatedProject.updatedAt), updatedProject)
        .commit()

      if (!commit.ok) {
        throw new Error('Failed to update public project by timestamp')
      }
    }
    // if the project was not public
    else {
      // set the public entry by timestamp to the updated project
      const commit = await kv.atomic()
        .check({ key: k.publicProjectByTimestamp(updatedProject.updatedAt), versionstamp: null })
        .set(k.publicProjectByTimestamp(updatedProject.updatedAt), updatedProject)
        .commit()

      if (!commit.ok) {
        throw new Error('Failed to update public project by timestamp')
      }
    }
  }
  // if the updated project is not public
  else {
    // if it was public
    if (project.value.isPublic) {
      // get the public entry
      const publicEntry = await kv.get(k.publicProject(updatedProject.id))
      // if the public entry exists
      if (publicEntry.value) {
        // delete the public entry
        const commit = await kv.atomic()
          .check({ key: k.publicProject(updatedProject.id), versionstamp: publicEntry.versionstamp })
          .delete(k.publicProject(updatedProject.id))
          .delete(k.publicProjectByUserId(session.userId, updatedProject.id))
          .delete(k.publicProjectByTimestamp(project.value.updatedAt))
          .commit()

        if (!commit.ok) {
          throw new Error('Failed to delete public project')
        }
      }
    }
  }

  return c.json(ProjectSchema.parse(updatedProject), 200)
})

app.delete('/api/projects/:id', async c => {
  const { session } = await requireSession(c)
  if (!session) {
    return errorResponse(c, 'Not authenticated', 401)
  }

  const kv = await getKv()
  const id = c.req.param('id')

  const project = await kv.get<Project>(k.project(id))
  if (!project.value) {
    return errorResponse(c, 'Project not found', 404)
  }
  if (project.value.userId !== session.userId && !session.isAdmin) {
    return errorResponse(c, 'Not authorized', 403)
  }

  const user = await kv.get<User>(k.user(project.value.userId))
  if (!user.value) {
    return errorResponse(c, 'User not found', 404)
  }

  const commit = await kv.atomic()
    .check({ key: k.project(id), versionstamp: project.versionstamp })
    .delete(k.project(id))
    .delete(k.projectByUserId(session.userId, id))
    .commit()

  if (!commit.ok) {
    throw new Error('Failed to delete project')
  }

  if (project.value.isPublic) {
    const publicEntry = await kv.get(k.publicProject(id))
    const commit = await kv.atomic()
      .check({ key: k.publicProject(id), versionstamp: publicEntry.versionstamp })
      .delete(k.publicProject(id))
      .delete(k.publicProjectByUserId(session.userId, id))
      .delete(k.publicProjectByTimestamp(project.value.updatedAt))
      .commit()
    if (!commit.ok) {
      throw new Error('Failed to delete public project')
    }
  }

  await kv.set(k.user(project.value.userId), { ...user.value,
    projects: user.value.projects?.filter(p => p !== id) ?? [] })
  if (!commit.ok) {
    throw new Error('Failed to update user')
  }

  return c.json(OkResponseSchema.parse({ ok: true }), 200)
})

// Likes
app.post('/api/like/:id', async c => {
  const { session } = await requireSession(c)
  if (!session) {
    return errorResponse(c, 'Not authenticated', 401)
  }

  const kv = await getKv()
  const id = c.req.param('id')

  const user = await kv.get<User>(k.user(session.userId))
  if (!user.value) {
    return errorResponse(c, 'User not found', 404)
  }

  if (user.value.likes?.includes(id)) {
    return errorResponse(c, 'Project already liked', 400)
  }

  user.value.likes = [...(user.value.likes ?? []), id]
  session.likes = [...(session.likes ?? []), id]

  const project = await kv.get<Project>(k.project(id))
  if (!project.value) {
    return errorResponse(c, 'Project not found', 404)
  }

  const like: Like = {
    userId: session.userId,
    artistName: session.artistName,
  }

  project.value.likes.push(like)

  const commit = await kv.atomic()
    .check({ key: k.likeByUserId(session.userId, project.value.id), versionstamp: null })
    .set(k.likeByUserId(session.userId, project.value.id), project.value)
    .set(k.user(session.userId), user.value)
    .set(k.session(session.id), session)
    .commit()

  if (!commit.ok) {
    throw new Error('Failed to like project')
  }

  await updateProject(project)

  return c.json(OkResponseSchema.parse({ ok: true }), 201)
})

app.delete('/api/like/:id', async c => {
  const { session } = await requireSession(c)
  if (!session) {
    return errorResponse(c, 'Not authenticated', 401)
  }

  const kv = await getKv()
  const id = c.req.param('id')

  const user = await kv.get<User>(k.user(session.userId))
  if (!user.value) {
    return errorResponse(c, 'User not found', 404)
  }

  if (!user.value.likes?.includes(id)) {
    return errorResponse(c, 'Project not liked', 400)
  }

  user.value.likes = user.value.likes?.filter(l => l !== id) ?? []
  session.likes = session.likes?.filter(l => l !== id) ?? []

  const project = await kv.get<Project>(k.project(id))
  if (!project.value) {
    return errorResponse(c, 'Project not found', 404)
  }

  const like = project.value.likes.find(l => l.userId === session.userId)
  if (!like) {
    return errorResponse(c, 'Project not liked', 400)
  }

  const commit = await kv.atomic()
    .delete(k.likeByUserId(session.userId, project.value.id))
    .set(k.user(session.userId), user.value)
    .set(k.session(session.id), session)
    .commit()

  if (!commit.ok) {
    throw new Error('Failed to unlike project')
  }

  project.value.likes = project.value.likes.filter(l => l.userId !== session.userId)

  await updateProject(project)

  return c.json(OkResponseSchema.parse({ ok: true }), 200)
})

// Comments
app.post('/api/comment/:id', async c => {
  const { session } = await requireSession(c)
  if (!session) {
    return errorResponse(c, 'Not authenticated', 401)
  }

  const kv = await getKv()
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => null)
  if (body === null) {
    return errorResponse(c, 'Invalid JSON', 400)
  }

  const parsed = CommentRequestSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(c, zodErrorMessage(parsed.error), 400)
  }
  const comment: Comment = {
    id: newId(),
    userId: session.userId,
    artistName: session.artistName,
    comment: parsed.data.comment,
    createdAt: Date.now(),
  }

  const project = await kv.get<Project>(k.project(id))
  if (!project.value) {
    return errorResponse(c, 'Project not found', 404)
  }

  project.value.comments.push(comment)

  await updateProject(project)

  return c.json(CommentSchema.parse(comment), 201)
})

app.delete('/api/comment/:id/:commentId', async c => {
  const { session } = await requireSession(c)
  if (!session) {
    return errorResponse(c, 'Not authenticated', 401)
  }

  const kv = await getKv()
  const id = c.req.param('id')
  const commentId = c.req.param('commentId')

  const project = await kv.get<Project>(k.project(id))
  if (!project.value) {
    return errorResponse(c, 'Project not found', 404)
  }

  const comment = project.value.comments.find(c => c.id === commentId)
  if (!comment) {
    return errorResponse(c, 'Comment not found', 404)
  }

  if (comment.userId !== session.userId && !session.isAdmin) {
    return errorResponse(c, 'Not authorized', 403)
  }

  project.value.comments = project.value.comments.filter(c => c.id !== commentId)

  await kv.delete(k.commentByUserId(comment.userId, id, commentId))
  await updateProject(project)

  return c.json(OkResponseSchema.parse({ ok: true }), 200)
})

// Browse
app.get('/api/browse/newest', async c => {
  const kv = await getKv()
  const projects = kv.list({ prefix: k.publicProjectsByTimestamp() }, { reverse: true })
  const values = await Array.fromAsync(projects)
  return c.json(ProjectsSchema.parse(values.map(v => v.value).filter(Boolean)), 200)
})

app.get('/api/browse/liked', async c => {
  const { session } = await requireSession(c)
  if (!session) {
    return errorResponse(c, 'Not authenticated', 401)
  }

  const kv = await getKv()
  const projects = kv.list({ prefix: k.likesByUserId(session.userId) })
  const values = await Array.fromAsync(projects)
  return c.json(ProjectsSchema.parse(values.map(v => v.value).filter(Boolean)), 200)
})

app.get('/api/browse/one-liners', async c => {
  const kv = await getKv()
  const oneLiners = kv.list({ prefix: k.oneLiners() }, { reverse: true })
  const values = await Array.fromAsync(oneLiners)
  return c.json(OneLinersSchema.parse(values.map(v => v.value).filter(Boolean)), 200)
})

app.post('/api/browse/one-liners', async c => {
  const body = await c.req.json().catch(() => null)
  if (body === null) {
    return errorResponse(c, 'Invalid JSON', 400)
  }

  const parsed = OneLinerRequestSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(c, zodErrorMessage(parsed.error), 400)
  }

  const kv = await getKv()
  const timestamp = Date.now()
  const id = newId()
  const oneLiner: OneLiner = {
    id,
    code: parsed.data.code,
    createdAt: timestamp,
  }
  const commit = await kv.atomic()
    .check({ key: k.oneLiner(timestamp, id), versionstamp: null })
    .set(k.oneLiner(timestamp, id), oneLiner)
    .commit()

  if (!commit.ok) {
    return errorResponse(c, 'Failed to post one-liner', 500)
  }

  return c.json(OneLinerSchema.parse(oneLiner), 201)
})

app.delete('/api/browse/one-liners', async c => {
  const body = await c.req.json().catch(() => null)
  if (body === null) {
    return errorResponse(c, 'Invalid JSON', 400)
  }

  const parsed = OneLinerSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(c, zodErrorMessage(parsed.error), 400)
  }

  const kv = await getKv()
  const commit = await kv.atomic()
    .delete(k.oneLiner(parsed.data.createdAt, parsed.data.id))
    .commit()

  if (!commit.ok) {
    return errorResponse(c, 'Failed to delete one-liner', 500)
  }

  return c.json(OkResponseSchema.parse({ ok: true }), 200)
})

app.get('/api/user-projects/:id', async c => {
  const userId = c.req.param('id')
  const kv = await getKv()
  const projects = kv.list({ prefix: k.publicProjectsByUserId(userId) })
  const values = await Array.fromAsync(projects)
  return c.json(ProjectsSchema.parse(values.map(v => v.value).filter(Boolean)), 200)
})

// AI
app.post('/api/ai/generate-track', async c => {
  const body = await c.req.json().catch(() => null)
  if (body === null) {
    return errorResponse(c, 'Invalid JSON', 400)
  }

  const parsed = GenerateTrackRequestSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(c, zodErrorMessage(parsed.error), 400)
  }

  const track = await generateAITrack(parsed.data.prompt, parsed.data.temperature, parsed.data.topP, parsed.data.model)
  return c.json(GenerateTrackResponseSchema.parse(track), 201)
})

app.post('/api/ai/modify-track', async c => {
  const body = await c.req.json().catch(() => null)
  if (body === null) {
    return errorResponse(c, 'Invalid JSON', 400)
  }

  const parsed = ModifyTrackRequestSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(c, zodErrorMessage(parsed.error), 400)
  }

  const track = await modifyAITrack(parsed.data.prompt, parsed.data.currentCode, parsed.data.temperature,
    parsed.data.topP, parsed.data.model)
  return c.json(ModifyTrackResponseSchema.parse(track), 201)
})

app.post('/api/ai/generate-similar-track', async c => {
  const body = await c.req.json().catch(() => null)
  if (body === null) {
    return errorResponse(c, 'Invalid JSON', 400)
  }

  const parsed = GenerateSimilarTrackRequestSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(c, zodErrorMessage(parsed.error), 400)
  }

  const track = await generateSimilarTrack(parsed.data.currentCode, parsed.data.temperature, parsed.data.topP,
    parsed.data.model)
  return c.json(GenerateSimilarTrackResponseSchema.parse(track), 201)
})

// Admin
app.get('/api/admin/users', async c => {
  const { session } = await requireSession(c)
  if (!session) {
    return errorResponse(c, 'Not authenticated', 401)
  }

  if (!session.isAdmin) {
    return errorResponse(c, 'Not authorized', 403)
  }

  const kv = await getKv()
  const users = kv.list({ prefix: k.users() })
  const values = await Array.fromAsync(users)
  return c.json(UsersSchema.parse(values.map(v => v.value).filter(Boolean)), 200)
})

app.post('/api/admin/send-welcome-email', async c => {
  const { session } = await requireSession(c)
  if (!session) return errorResponse(c, 'Not authenticated', 401)
  if (!session.isAdmin) return errorResponse(c, 'Not authorized', 403)
  const raw = await c.req.json().catch(() => null)
  if (raw === null) return errorResponse(c, 'Invalid JSON', 400)
  const parsed = z.object({ userId: z.string().min(1) }).safeParse(raw)
  if (!parsed.success) return errorResponse(c, 'User ID is required', 400)
  const kv = await getKv()
  const userEntry = await kv.get<User>(k.user(parsed.data.userId))
  const user = userEntry.value ?? null
  if (!user) return errorResponse(c, 'User not found', 404)
  await kv.set(k.user(parsed.data.userId), { ...user, sentWelcomeEmail: true })
  return c.json(OkResponseSchema.parse({ ok: true }), 200)
})

app.post('/api/admin/send-beta-email', async c => {
  const { session } = await requireSession(c)
  if (!session) return errorResponse(c, 'Not authenticated', 401)
  if (!session.isAdmin) return errorResponse(c, 'Not authorized', 403)
  const raw = await c.req.json().catch(() => null)
  if (raw === null) return errorResponse(c, 'Invalid JSON', 400)
  const parsed = z.object({ userId: z.string().min(1) }).safeParse(raw)
  if (!parsed.success) return errorResponse(c, 'User ID is required', 400)
  const kv = await getKv()
  const userEntry = await kv.get<User>(k.user(parsed.data.userId))
  const user = userEntry.value ?? null
  if (!user) return errorResponse(c, 'User not found', 404)

  const text = `Hi ${user.artistName || 'there'}!

loopmaster just got a fresh update and you should check it out! It's been built from the ground up based on feedback from the community.

The link is here >>> https://beta.loopmaster.xyz <<<

I'd love to hear what you think! Leave a comment on the feedback board post https://loopmaster.featurebase.app/p/loopmaster-beta or come say hi on Discord! https://discord.gg/NSWaB9dRYh

🎶 Enjoy creating! 🎶

---
You're receiving this email because you signed up for loopmaster.
Don't reply to this email. For feedback, use the feedback board or Discord.

© ${new Date().getFullYear()} loopmaster. All rights reserved.`

  await sendEmail(user.email, 'loopmaster got an update! 🎧', undefined, text)
  await kv.set(k.user(parsed.data.userId), { ...user, sentBetaEmail: true })
  return c.json(OkResponseSchema.parse({ ok: true }), 200)
})

app.delete('/api/admin/users/:id', async c => {
  const { session } = await requireSession(c)
  if (!session) return errorResponse(c, 'Not authenticated', 401)
  if (!session.isAdmin) return errorResponse(c, 'Not authorized', 403)
  const id = c.req.param('id')
  const kv = await getKv()
  const userEntry = await kv.get<User>(k.user(id))
  const user = userEntry.value ?? null
  if (!user) return errorResponse(c, 'User not found', 404)
  const sessionToken = (await kv.get<string>(k.sessionByUserId(id))).value
  const a = kv.atomic()
    .delete(k.user(id))
    .delete(k.userByEmail(user.email))
    .delete(k.avatar(id))
  if (sessionToken) {
    a.delete(k.session(sessionToken))
    a.delete(k.sessionByUserId(id))
  }
  await a.commit()
  return c.json(OkResponseSchema.parse({ ok: true }), 200)
})

app.get('/api/admin/projects', async c => {
  const { session } = await requireSession(c)
  if (!session) {
    return errorResponse(c, 'Not authenticated', 401)
  }

  if (!session.isAdmin) {
    return errorResponse(c, 'Not authorized', 403)
  }

  const kv = await getKv()
  const projects = kv.list({ prefix: k.projects() })
  const values = await Array.fromAsync(projects)
  return c.json(ProjectsSchema.parse(values.map(v => v.value).filter(Boolean)), 200)
})

app.get('/api/admin/public-projects', async c => {
  const { session } = await requireSession(c)
  if (!session) {
    return errorResponse(c, 'Not authenticated', 401)
  }

  if (!session.isAdmin) {
    return errorResponse(c, 'Not authorized', 403)
  }

  const kv = await getKv()
  const publicProjects = kv.list({ prefix: k.publicProjects() }, { reverse: true })
  const publicProjectsByUserId = kv.list({ prefix: k.publicProjectsByUserIdAll() })
  const publicProjectsByTimestamp = kv.list({ prefix: k.publicProjectsByTimestamp() }, { reverse: true })

  const publicProjectsValues = await Array.fromAsync(publicProjects)
  const publicProjectsByTimestampValues = await Array.fromAsync(publicProjectsByTimestamp)
  const publicProjectsByUserIdValues = await Array.fromAsync(publicProjectsByUserId)

  return c.json({
    publicProjects: publicProjectsValues.map(v => v.value).filter(Boolean),
    publicProjectsByTimestamp: publicProjectsByTimestampValues.map(v => v.value).filter(Boolean),
    publicProjectsByUserId: publicProjectsByUserIdValues.map(v => v.value).filter(Boolean),
  })
})

app.post('/api/admin/reindex-public-projects', async c => {
  const { session } = await requireSession(c)
  if (!session) {
    return errorResponse(c, 'Not authenticated', 401)
  }

  if (!session.isAdmin) {
    return errorResponse(c, 'Not authorized', 403)
  }

  const kv = await getKv()

  // delete all public projects
  const publicProjects = kv.list<Project>({ prefix: k.publicProjects() })
  const publicProjectsByUserId = kv.list<Project>({ prefix: k.publicProjectsByUserIdAll() })
  const publicProjectsByTimestamp = kv.list<Project>({ prefix: k.publicProjectsByTimestamp() })

  const publicProjectsValues = await Array.fromAsync(publicProjects)
  const publicProjectsByUserIdValues = await Array.fromAsync(publicProjectsByUserId)
  const publicProjectsByTimestampValues = await Array.fromAsync(publicProjectsByTimestamp)

  for (const project of publicProjectsValues) {
    await kv.delete(project.key)
  }

  for (const project of publicProjectsByUserIdValues) {
    await kv.delete(project.key)
  }

  for (const timestamp of publicProjectsByTimestampValues) {
    await kv.delete(timestamp.key)
  }

  // reindex the public projects
  const projects = kv.list<Project>({ prefix: k.projects() })
  const projectsValues = await Array.fromAsync(projects)
  for (const project of projectsValues) {
    if (project.value.isPublic) {
      await kv.set(k.publicProject(project.value.id), project.value)
      await kv.set(k.publicProjectByUserId(project.value.userId, project.value.id), project.value)
      await kv.set(k.publicProjectByTimestamp(project.value.updatedAt), project.value)
    }
  }

  return c.json({ ok: true }, 200)
})

app.post('/api/admin/reset-migrations', async c => {
  const { session } = await requireSession(c)
  if (!session) {
    return errorResponse(c, 'Not authenticated', 401)
  }
  if (!session.isAdmin) {
    return errorResponse(c, 'Not authorized', 403)
  }
  const kv = await getKv()
  await kv.set(k.migrationsVersion(), 0)
  return c.json({ ok: true }, 200)
})

app.get('/api/admin/backup', async c => {
  const { session } = await requireSession(c)
  if (!session) {
    return errorResponse(c, 'Not authenticated', 401)
  }
  if (!session.isAdmin) {
    return errorResponse(c, 'Not authorized', 403)
  }

  const kv = await getKv()

  const prefixes = [
    'user',
    'projects',
    'one_liners',
    'avatars',
  ]

  const zipFileWriter = new BlobWriter('application/zip')
  const zipWriter = new ZipWriter(zipFileWriter)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)

  for (const prefix of prefixes) {
    const entries: Array<{ key: Deno.KvKey; value: unknown }> = []
    const iter = kv.list({ prefix: [prefix] })
    for await (const entry of iter) {
      entries.push({
        key: entry.key,
        value: entry.value,
      })
    }

    if (entries.length > 0) {
      const jsonData = JSON.stringify(entries, null, 2)
      const jsonBytes = new TextEncoder().encode(jsonData)
      await zipWriter.add(`${prefix}.json`, new Uint8ArrayReader(jsonBytes))
    }
  }

  await zipWriter.close()
  const zipBlob = await zipFileWriter.getData()

  return new Response(zipBlob, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="backup-${timestamp}.zip"`,
      ...corsHeaders(c.req.header('Origin') || undefined),
    },
  })
})

app.post('/api/admin/restore-backup', async c => {
  const { session } = await requireSession(c)
  if (!session) {
    return errorResponse(c, 'Not authenticated', 401)
  }
  if (!session.isAdmin) {
    return errorResponse(c, 'Not authorized', 403)
  }

  const form = await c.req.formData().catch(() => null)
  if (form === null) {
    return errorResponse(c, 'Invalid form data', 400)
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return errorResponse(c, 'Backup file is required', 400)
  }

  const zipReader = new ZipReader(new BlobReader(file))
  const zipEntries = await zipReader.getEntries()
  const files = new Map<string, string>()

  for (const entry of zipEntries) {
    if (entry.directory || !entry.getData) continue
    const blob = await entry.getData(new BlobWriter())
    const text = await blob.text()
    files.set(entry.filename, text)
  }

  await zipReader.close()

  const kv = await getKv()

  const prefixes: Deno.KvKey[] = [
    ['user'],
    ['user_by_email'],
    ['session'],
    ['session_by_user_id'],
    ['projects'],
    ['projects_by_user_id'],
    ['likes_by_user_id'],
    ['comments_by_user_id'],
    ['public_projects'],
    ['public_projects_by_timestamp'],
    ['public_projects_by_user_id'],
    ['hot_projects_events'],
    ['one_liners'],
    ['avatars'],
  ]

  for (const prefix of prefixes) {
    const entries = kv.list({ prefix })
    for await (const entry of entries) {
      await kv.delete(entry.key)
    }
  }

  let users = 0
  let projects = 0
  let oneLiners = 0
  let avatars = 0

  const userJson = files.get('user.json')
  if (userJson) {
    const raw = JSON.parse(userJson) as Array<{ key: unknown; value: unknown }>
    for (const entry of raw) {
      if (!Array.isArray((entry as { key: unknown }).key)) {
        throw new Error('Invalid user entry key')
      }
      const [prefix, id] = (entry as { key: unknown[] }).key as [string, string]
      if (prefix !== 'user') {
        throw new Error('Invalid user key prefix')
      }
      const user = UserSchema.parse((entry as { value: unknown }).value)
      const email = user.email.trim().toLowerCase()
      const normalizedUser = {
        ...user,
        email,
        projects: user.projects ?? [],
        likes: user.likes ?? [],
      }
      await kv.set(k.user(id), normalizedUser)
      await kv.set(k.userByEmail(email), id)
      users++
    }
  }

  const avatarsJson = files.get('avatars.json')
  if (avatarsJson) {
    const raw = JSON.parse(avatarsJson) as Array<{ key: unknown; value: unknown }>
    for (const entry of raw) {
      if (!Array.isArray((entry as { key: unknown }).key)) {
        throw new Error('Invalid avatar entry key')
      }
      const [prefix, userId] = (entry as { key: unknown[] }).key as [string, string]
      if (prefix !== 'avatars') {
        throw new Error('Invalid avatar key prefix')
      }
      const value = (entry as { value: unknown }).value
      if (!value || typeof value !== 'object') {
        throw new Error('Invalid avatar value')
      }
      const bytes = profileImageValueToBytes(value as Record<string, number>)
      await kv.set(k.avatar(userId), bytes)
      avatars++
    }
  }

  const projectsJson = files.get('projects.json')
  if (projectsJson) {
    const raw = JSON.parse(projectsJson) as Array<{ key: unknown; value: unknown }>
    for (const entry of raw) {
      if (!Array.isArray((entry as { key: unknown }).key)) {
        throw new Error('Invalid project entry key')
      }
      const [prefix] = (entry as { key: unknown[] }).key as [string, string]
      if (prefix !== 'projects') {
        throw new Error('Invalid project key prefix')
      }
      const project = ProjectSchema.parse((entry as { value: unknown }).value)
      await restoreProject(project)
      projects++
    }
  }

  const oneLinersJson = files.get('one_liners.json')
  if (oneLinersJson) {
    const raw = JSON.parse(oneLinersJson) as Array<{ key: unknown; value: unknown }>
    for (const entry of raw) {
      if (!Array.isArray((entry as { key: unknown }).key)) {
        throw new Error('Invalid one-liner entry key')
      }
      const [prefix] = (entry as { key: unknown[] }).key as [string, number, string]
      if (prefix !== 'one_liners') {
        throw new Error('Invalid one-liner key prefix')
      }
      const oneLiner = OneLinerSchema.parse((entry as { value: unknown }).value)
      await kv.set(k.oneLiner(oneLiner.createdAt, oneLiner.id), oneLiner)
      oneLiners++
    }
  }

  const base = OkResponseSchema.parse({ ok: true })

  return c.json({ ...base, users, projects, oneLiners, avatars }, 200)
})

const V1UserEntrySchema = z.object({
  key: z.tuple([z.literal('users'), z.string()]),
  value: z.object({
    id: z.string(),
    email: z.string(),
    passwordHash: z.string(),
    name: z.string(),
    createdAt: z.number(),
    isAdmin: z.boolean().optional(),
    lastSeenAt: z.number().optional(),
    sentWelcomeEmail: z.boolean().optional(),
  }),
})

const V1ProfileImageEntrySchema = z.object({
  key: z.tuple([z.literal('profile_images'), z.string()]),
  value: z.record(z.string(), z.number()),
})

function profileImageValueToBytes(value: Record<string, number>): Uint8Array {
  const entries = Object.entries(value).sort((a, b) => Number(a[0]) - Number(b[0]))
  return new Uint8Array(entries.map(([, v]) => v))
}

const UploadUsersV1RequestSchema = z.object({
  users: z.array(z.unknown()),
  profileImages: z.array(z.unknown()).optional().default([]),
})

app.post('/api/admin/upload-users-v1', async c => {
  const { session } = await requireSession(c)
  if (!session) return errorResponse(c, 'Not authenticated', 401)
  if (!session.isAdmin) return errorResponse(c, 'Not authorized', 403)
  const raw = await c.req.json().catch(() => null)
  if (raw === null) return errorResponse(c, 'Invalid JSON', 400)
  const parsed = UploadUsersV1RequestSchema.safeParse(raw)
  if (!parsed.success) return errorResponse(c, 'Expected { users: array }', 400)
  const kv = await getKv()
  const oldIdToNewId = new Map<string, string>()
  let imported = 0
  let skipped = 0
  for (const entry of parsed.data.users) {
    const userParsed = V1UserEntrySchema.safeParse(entry)
    if (!userParsed.success) {
      console.error('Invalid v1 user entry:', userParsed.error)
      continue
    }
    const v = userParsed.data.value
    const email = v.email.trim().toLowerCase()
    const existing = await kv.get<string>(k.userByEmail(email))
    if (existing.value) {
      skipped++
      continue
    }
    const userId = newId()
    oldIdToNewId.set(v.id, userId)
    const passwordHash = hash(v.passwordHash)
    const now = Date.now()
    const user: User = {
      id: userId,
      artistName: v.name,
      email,
      passwordHash,
      sentWelcomeEmail: v.sentWelcomeEmail ?? false,
      sentBetaEmail: false,
      projects: [],
      likes: [],
      createdAt: v.createdAt,
      updatedAt: v.lastSeenAt ?? v.createdAt ?? now,
      isAdmin: v.isAdmin,
    }
    const commit = await kv.atomic()
      .check({ key: k.user(userId), versionstamp: null })
      .check({ key: k.userByEmail(email), versionstamp: null })
      .set(k.user(userId), user)
      .set(k.userByEmail(email), userId)
      .commit()
    if (commit.ok) imported++
  }
  let avatarsImported = 0
  for (const entry of parsed.data.profileImages) {
    const imgParsed = V1ProfileImageEntrySchema.safeParse(entry)
    if (!imgParsed.success) continue
    const [_, oldUserId] = imgParsed.data.key
    const newUserId = oldIdToNewId.get(oldUserId)
    if (!newUserId) continue
    const bytes = profileImageValueToBytes(imgParsed.data.value)
    await kv.set(k.avatar(newUserId), bytes)
    avatarsImported++
  }
  return c.json({ ok: true, imported, skipped, avatarsImported }, 200)
})

app.post('/api/admin/remove-all-users', async c => {
  const { session } = await requireSession(c)
  if (!session) {
    return errorResponse(c, 'Not authenticated', 401)
  }
  if (!session.isAdmin) {
    return errorResponse(c, 'Not authorized', 403)
  }
  const kv = await getKv()
  const adminEmails = new Set(ADMIN_EMAILS.map(e => e.toLowerCase()))
  const users = kv.list<User>({ prefix: k.users() })
  let removed = 0
  for await (const entry of users) {
    const user = entry.value
    if (!user || adminEmails.has(user.email.toLowerCase())) continue
    const sessionToken = (await kv.get<string>(k.sessionByUserId(user.id))).value
    if (sessionToken) {
      await kv.delete(k.session(sessionToken))
      await kv.delete(k.sessionByUserId(user.id))
    }
    await kv.delete(k.user(user.id))
    await kv.delete(k.userByEmail(user.email))
    await kv.delete(k.avatar(user.id))
    removed++
  }
  return c.json({ ok: true, removed }, 200)
})

// Serve SPA index.html
app.get('*', serveStatic({ path: './dist/index.html' }))

// Request Handler
async function handler(req: Request, connInfo: Deno.ServeHandlerInfo): Promise<Response> {
  try {
    const res = await app.fetch(req)
    const logLine = formatApacheLog(req, res, connInfo)
    console.log(logLine)
    if (res.status >= 500) {
      logError(`HTTP ${res.status}`, res.status as ContentfulStatusCode, { path: new URL(req.url).pathname,
        method: req.method })
    }
    return res
  }
  catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const stack = e instanceof Error ? e.stack : undefined
    const path = new URL(req.url).pathname
    logError(`Handler error: ${message}`, 500, { path, method: req.method })
    if (stack) console.error(stack)
    const error = jsonError('Internal server error', 500)
    const headers = { 'Content-Type': 'application/json', ...corsHeaders(req.headers.get('Origin') ?? undefined) }
    return new Response(JSON.stringify(error.body), { status: error.status, headers })
  }
}

// Run migrations
await runMigrations(await getKv())

const port = Number.parseInt(Deno.env.get('PORT') ?? '8787', 10) || 8787
Deno.serve({
  port,
  onListen({ port, hostname }) {
    console.log(`Server started at http://${hostname}:${port}`)
  },
}, handler)
