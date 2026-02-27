import type { Project } from './types.ts'

let kv: Deno.Kv | null = null

export async function getKv(): Promise<Deno.Kv> {
  if (kv) return kv
  const path = Deno.env.get('KV_PATH')
  kv = await Deno.openKv(path || undefined)
  return kv
}

export async function kvGetManyAll(kv: Deno.Kv, keys: readonly Deno.KvKey[]) {
  const out: Deno.KvEntryMaybe<unknown>[] = []
  for (let i = 0; i < keys.length; i += 10) {
    const chunk = keys.slice(i, i + 10) as unknown as readonly Deno.KvKey[]
    out.push(...(await kv.getMany(chunk)))
  }
  return out
}

export const k = {
  users: () => ['user'] as const,
  user: (id: string) => ['user', id] as const,
  userByEmail: (email: string) => ['user_by_email', email] as const,

  session: (token: string) => ['session', token] as const,
  sessionByUserId: (userId: string) => ['session_by_user_id', userId] as const,

  projects: () => ['projects'] as const,
  project: (id: string) => ['projects', id] as const,

  projectsByUserId: (userId: string) => ['projects_by_user_id', userId] as const,
  projectByUserId: (userId: string, projectId: string) => ['projects_by_user_id', userId, projectId] as const,

  likesByUserId: (userId: string) => ['likes_by_user_id', userId] as const,
  likeByUserId: (userId: string, projectId: string) => ['likes_by_user_id', userId, projectId] as const,

  commentsByUserId: (userId: string) => ['comments_by_user_id', userId] as const,
  commentByUserId: (userId: string, projectId: string, commentId: string) =>
    ['comments_by_user_id', userId, projectId, commentId] as const,

  publicProjects: () => ['public_projects'] as const,
  publicProject: (id: string) => ['public_projects', id] as const,

  publicProjectsByTimestamp: () => ['public_projects_by_timestamp'] as const,
  publicProjectByTimestamp: (timestamp: number) => ['public_projects_by_timestamp', timestamp] as const,

  publicProjectsByUserIdAll: () => ['public_projects_by_user_id'] as const,
  publicProjectsByUserId: (userId: string) => ['public_projects_by_user_id', userId] as const,
  publicProjectByUserId: (userId: string, projectId: string) =>
    ['public_projects_by_user_id', userId, projectId] as const,

  hotProjectsEvents: () => ['hot_projects_events'] as const,

  oneLiners: () => ['one_liners'] as const,
  oneLiner: (timestamp: number, id: string) => ['one_liners', timestamp, id] as const,

  avatar: (userId: string) => ['avatars', userId] as const,

  migrationsVersion: () => ['migrations_version'] as const,
  migration: (version: number) => ['migrations', version] as const,
}

export async function updateProject(projectEntry: Deno.KvEntry<Project>) {
  const kv = await getKv()

  const project = projectEntry.value

  const commit = await kv.atomic()
    .check({ key: k.project(project.id), versionstamp: projectEntry.versionstamp })
    .set(k.project(project.id), project)
    .set(k.projectByUserId(project.userId, project.id), project)
    .commit()

  if (!commit.ok) {
    throw new Error('Failed to update project')
  }

  if (project.isPublic) {
    const publicEntry = await kv.get<Project>(k.publicProject(project.id))
    if (publicEntry.value) {
      const commit = await kv.atomic()
        .check({ key: k.publicProject(project.id), versionstamp: publicEntry.versionstamp })
        .set(k.publicProject(project.id), project)
        .set(k.publicProjectByUserId(project.userId, project.id), project)
        .set(k.publicProjectByTimestamp(project.updatedAt), project)
        .commit()

      if (!commit.ok) {
        throw new Error('Failed to update public project')
      }
    }
  }

  for (const like of project.likes) {
    const commit = await kv.atomic()
      .set(k.likeByUserId(like.userId, project.id), project)
      .commit()

    if (!commit.ok) {
      throw new Error('Failed to update project like')
    }
  }

  for (const comment of project.comments) {
    const commit = await kv.atomic()
      .set(k.commentByUserId(comment.userId, project.id, comment.id), true)
      .commit()

    if (!commit.ok) {
      throw new Error('Failed to update project comment')
    }
  }
}

export async function updateCommentArtistNames(userId: string, artistName: string) {
  const kv = await getKv()
  const commentEntries = kv.list({ prefix: k.commentsByUserId(userId) })
  const projectIds = new Set<string>()
  for await (const entry of commentEntries) {
    const key = entry.key as readonly [prefix: string, userId: string, projectId: string, commentId: string]
    projectIds.add(key[2])
  }
  for (const projectId of projectIds) {
    const projectEntry = await kv.get<Project>(k.project(projectId))
    if (!projectEntry.value) continue
    let changed = false
    for (const comment of projectEntry.value.comments) {
      if (comment.userId === userId) {
        comment.artistName = artistName
        changed = true
      }
    }
    if (changed) await updateProject(projectEntry)
  }
}

export async function restoreProject(project: Project) {
  const kv = await getKv()

  await kv.set(k.project(project.id), project)
  await kv.set(k.projectByUserId(project.userId, project.id), project)

  if (project.isPublic) {
    await kv.set(k.publicProject(project.id), project)
    await kv.set(k.publicProjectByUserId(project.userId, project.id), project)
    await kv.set(k.publicProjectByTimestamp(project.updatedAt), project)
  }

  for (const like of project.likes) {
    await kv.set(k.likeByUserId(like.userId, project.id), project)
  }

  for (const comment of project.comments) {
    await kv.set(k.commentByUserId(comment.userId, project.id, comment.id), true)
  }
}
