import type { Context } from '@hono/hono'
import { deleteCookie, getCookie, setCookie } from '@hono/hono/cookie'
import { isAdmin, yearFromNow } from './helpers.ts'
import { getKv, k } from './kv.ts'
import { type Session, type User } from './types.ts'

const cookieName = 'sid'

export function getSessionToken(c: Context): string | null {
  return getCookie(c, cookieName) ?? null
}

export async function getSessionByToken(token: string): Promise<Session | null> {
  const kv = await getKv()
  const entry = await kv.get<Session>(k.session(token))
  return entry.value ?? null
}

export function setSessionCookie(c: Context, token: string): void {
  setCookie(c, cookieName, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: true,
    maxAge: 365 * 24 * 60 * 60, // 1 year in seconds
    expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year in milliseconds
  })
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, cookieName, { path: '/' })
}

export function sessionFromUser(id: string, user: User): Session {
  return {
    id,
    userId: user.id,
    artistName: user.artistName,
    email: user.email,
    projects: user.projects ?? [],
    likes: user.likes ?? [],
    isAdmin: isAdmin(user.email),
    expiresAt: yearFromNow(),
  }
}

export async function requireSession(c: Context): Promise<{ token: string | null; session: Session | null }> {
  const token = getSessionToken(c)
  if (!token) return { token: null, session: null as Session | null }
  const session = await getSessionByToken(token)
  if (!session) return { token, session: null as Session | null }
  return { token, session }
}
