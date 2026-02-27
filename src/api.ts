import { batch, effect, signal } from '@preact/signals-core'
import { createDoc } from 'editor'
import { Deferred } from 'utils/deferred'
import type {
  AuthLoginRequest,
  AuthRegisterRequest,
  Comment,
  CommentRequest,
  CreateProjectRequest,
  GenerateTrackRequest,
  GenerateTrackResponse,
  OkResponse,
  OneLiner,
  OneLinerRequest,
  OneLiners,
  Project,
  Projects,
  Session,
  UpdateArtistNameRequest,
  UpdateProjectRequest,
  Users,
} from '../deno/types.ts'
import { tokenize } from './lib/tokenizer.ts'
import { busyLock, busyUnlock, createProject, type Project as StateProject, projects, session } from './state.ts'

export const projectsLoading = signal(false)

const profileImageCache = new Map<string, Promise<Blob>>()

export class API {
  constructor(private fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {}

  private async requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await this.fetch(url, init)
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const message = (json && typeof json === 'object' && typeof (json as { message: string }).message === 'string')
        ? (json as { message: string }).message
        : `Request failed: ${res.status}`
      throw new Error(message)
    }
    return json as T
  }

  fetchSession = async () => {
    const res = await this.fetch('/api/session')
    const json = await res.json()
    if (res.status === 401) return null
    if (!res.ok) {
      throw new Error('Failed to fetch session: ' + json.message)
    }
    return json
  }

  fetchProjects = async () => {
    if (projects.value.length === 0) projectsLoading.value = true
    try {
      return await this.requestJson<Projects>('/api/projects')
    }
    finally {
      projectsLoading.value = false
    }
  }

  fetchUserProjects = async (userId: string) => {
    return await this.requestJson<Projects>(`/api/user-projects/${userId}`)
  }

  fetchProject = async (id: string) => {
    return await this.requestJson<Project>(`/api/projects/${id}`)
  }

  fetchBrowseNewest = async () => {
    return await this.requestJson<Projects>('/api/browse/newest')
  }

  fetchBrowsePopular = async () => {
    return await this.requestJson<Projects>('/api/browse/popular')
  }

  fetchBrowseHottest = async () => {
    return await this.requestJson<Projects>('/api/browse/hottest')
  }

  fetchBrowseLiked = async () => {
    return await this.requestJson<Projects>('/api/browse/liked')
  }

  fetchBrowseOneLiners = async () => {
    return await this.requestJson<OneLiners>('/api/browse/one-liners')
  }

  postBrowseOneLiner = async (code: string) => {
    return await this.requestJson<OneLiner>('/api/browse/one-liners', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code } satisfies OneLinerRequest),
    })
  }

  deleteBrowseOneLiner = async (oneLiner: OneLiner) => {
    return await this.requestJson<OkResponse>('/api/browse/one-liners', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(oneLiner),
    })
  }

  generateAITrack = async (prompt: string, temperature: number, topP: number, model: string) => {
    return await this.requestJson<GenerateTrackResponse>('/api/ai/generate-track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, temperature, topP, model } satisfies GenerateTrackRequest),
    })
  }

  fetchAdminUsers = async () => {
    return await this.requestJson<Users>('/api/admin/users')
  }

  sendWelcomeEmail = async (userId: string) => {
    return await this.requestJson<OkResponse>('/api/admin/send-welcome-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
  }

  sendBetaEmail = async (userId: string) => {
    return await this.requestJson<OkResponse>('/api/admin/send-beta-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
  }

  deleteUser = async (userId: string) => {
    return await this.requestJson<OkResponse>(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    })
  }

  fetchAdminProjects = async () => {
    return await this.requestJson<Projects>('/api/admin/projects')
  }

  reindexPublicProjects = async () => {
    return await this.requestJson<OkResponse>('/api/admin/reindex-public-projects', {
      method: 'POST',
    })
  }

  resetMigrations = async () => {
    return await this.requestJson<OkResponse>('/api/admin/reset-migrations', {
      method: 'POST',
    })
  }

  removeAllUsers = async () => {
    return await this.requestJson<{ ok: true; removed: number }>('/api/admin/remove-all-users', {
      method: 'POST',
    })
  }

  uploadUsersFromV1 = async (users: unknown[], profileImages: unknown[]) => {
    return await this.requestJson<{ ok: true; imported: number; skipped: number; avatarsImported: number }>(
      '/api/admin/upload-users-v1',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ users, profileImages }),
      },
    )
  }

  fetchAdminPublicProjects = async () => {
    return await this.requestJson<{
      publicProjects: Projects
      publicProjectsByTimestamp: Projects
      publicProjectsByUserId: Projects
    }>('/api/admin/public-projects')
  }

  restoreBackup = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return await this.requestJson<OkResponse>('/api/admin/restore-backup', {
      method: 'POST',
      body: formData,
    })
  }

  createProject = async (project: StateProject) => {
    projectsLoading.value = true
    try {
      return await this.requestJson<Project>('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: project.name,
          code: project.scratch.code,
          isPublic: project.isPublic,
          remixOfId: project.remixOfId,
        } satisfies CreateProjectRequest),
      })
    }
    finally {
      projectsLoading.value = false
    }
  }

  saveProject = async (project: StateProject) => {
    if (!project.serverId) {
      return await this.createProject(project)
    }
    projectsLoading.value = true
    try {
      return await this.requestJson<Project>(`/api/projects/${project.serverId}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: project.name,
          code: project.scratch.code,
          isPublic: project.isPublic,
          remixOfId: project.remixOfId,
        } satisfies UpdateProjectRequest),
      })
    }
    finally {
      projectsLoading.value = false
    }
  }

  deleteProject = async (serverId: string) => {
    projectsLoading.value = true
    try {
      return await this.requestJson<OkResponse>(`/api/projects/${serverId}`, { method: 'DELETE' })
    }
    finally {
      projectsLoading.value = false
    }
  }

  likeProject = async (id: string) => {
    return await this.requestJson<void>(`/api/like/${id}`, { method: 'POST' })
  }

  unlikeProject = async (id: string) => {
    return await this.requestJson<void>(`/api/like/${id}`, { method: 'DELETE' })
  }

  commentProject = async (id: string, comment: string) => {
    return await this.requestJson<Comment>(`/api/comment/${id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ comment } satisfies CommentRequest),
    })
  }

  deleteComment = async (id: string, commentId: string) => {
    return await this.requestJson<void>(`/api/comment/${id}/${commentId}`, { method: 'DELETE' })
  }

  login = async (email: string, password: string) => {
    return await this.requestJson<Session>('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password } satisfies AuthLoginRequest),
    })
  }

  register = async (artistName: string, email: string, password: string) => {
    return await this.requestJson<Session>('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ artistName, email, password } satisfies AuthRegisterRequest),
    })
  }

  logout = async () => {
    const response = await this.requestJson<OkResponse>('/api/auth/logout', { method: 'POST' })
    if (response.ok) {
      session.value = null
    }
    else {
      throw new Error('Failed to logout')
    }
  }

  fetchAvatar = async (userId: string, cacheBust: number) => {
    const cacheKey = `${userId}?c=${cacheBust}`
    if (profileImageCache.has(cacheKey)) {
      return profileImageCache.get(cacheKey)!
    }
    const deferred = Deferred<Blob>()
    profileImageCache.set(cacheKey, deferred.promise)
    const response = await this.fetch(`/api/avatar/${userId}?c=${cacheBust}`)
    if (!response.ok) return deferred.reject(new Error('Failed to fetch avatar'))
    const data = await response.blob()
    deferred.resolve(data)
    return data
  }

  uploadAvatar = async (imageBlob: Blob) => {
    const arrayBuffer = await imageBlob.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    return this.requestJson<OkResponse>('/api/avatar', {
      method: 'POST',
      body: JSON.stringify({ image: base64 }),
    })
  }

  updateArtistName = async (artistName: string) => {
    return this.requestJson<OkResponse>('/api/artist-name', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ artistName } satisfies UpdateArtistNameRequest),
    })
  }

  fetchAdminBackup = async () => {
    const response = await this.fetch('/api/admin/backup', { method: 'GET' })
    if (!response.ok) {
      throw new Error('Failed to fetch backup')
    }
    return response.blob()
  }
}

export const api = new API(async (input, init) => {
  busyLock()
  if (import.meta.env.DEV) {
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  const res = await fetch(input, { ...init, credentials: 'include' })
  busyUnlock()
  return res
})

queueMicrotask(() => {
  api.fetchSession().then(result => {
    session.value = result
  })
  effect(() => {
    if (!session.value) return
    queueMicrotask(() => {
      api.fetchProjects().then((result: Project[]) => {
        batch(() => {
          for (const project of result) {
            const found = projects.value.find(p => p.serverId === project.id)
            if (found) {
              found.doc.code = project.code
              if (!found.scratch.code) found.scratch.code = project.code
              continue
            }
            const doc = createDoc(tokenize)
            doc.code = project.code

            const p = createProject({
              serverId: project.id,
              userId: project.userId,
              id: project.id,
              name: project.name,
              doc,
              remixOfId: project.remixOf?.id,
              isPublic: project.isPublic,
              isSaved: true,
            })
            if (!p.scratch.code) p.scratch.code = p.doc.code
            projects.value.push(p)
          }
          for (const project of projects.value) {
            const found = result.find(p => p.id === project.serverId)
            if (found) {
              continue
            }
            project.serverId = null
          }
          projects.value = [...projects.value]
        })
      })
    })
  })
})
