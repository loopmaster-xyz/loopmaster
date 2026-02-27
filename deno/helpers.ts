import { verify } from '@bronti/bcrypt'
import type { Context } from '@hono/hono'
import type { ContentfulStatusCode } from '@hono/hono/utils/http-status'
import { z, type ZodError } from '@zod/zod'
import { ErrorResponseSchema } from './types.ts'

export const ADMIN_EMAILS = ['gstagas@gmail.com']

const fieldLabel: Record<string, string> = {
  artistName: 'Name',
  email: 'Email',
  password: 'Password',
  epoch: 'Epoch',
  title: 'Title',
  code: 'Code',
  isPublic: 'Public',
  timestamp: 'Timestamp',
  content: 'Comment',
}

async function hashPasswordSha256(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function validatePassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    if (verify(password, passwordHash)) return true
  }
  catch {
    // bcrypt verify failed (plaintext)
  }
  const sha256Hash = await hashPasswordSha256(password)
  try {
    if (verify(sha256Hash, passwordHash)) return true
  }
  catch {
    // bcrypt verify failed (sha256 for migrated v1 users)
  }
  return sha256Hash === passwordHash
}

export function yearFromNow(): number {
  return Date.now() + 365 * 24 * 60 * 60 * 1000
}

export function isAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

export function logError(message: string, status: ContentfulStatusCode,
  context?: { path?: string; method?: string; userId?: string })
{
  const parts = [`[ERROR] ${status} ${message}`]
  if (context?.path) parts.push(`path: ${context.path}`)
  if (context?.method) parts.push(`method: ${context.method}`)
  if (context?.userId) parts.push(`userId: ${context.userId}`)
  console.error(parts.join(' | '))
}

export function jsonError(message: string, status: ContentfulStatusCode = 400) {
  return { body: ErrorResponseSchema.parse({ message }), status }
}

export function errorResponse(c: Context, message: string, status: ContentfulStatusCode = 400) {
  const err = jsonError(message, status)
  logError(message, status, { path: c.req.path, method: c.req.method })
  return c.json(err.body, err.status)
}

export function zodIssueMessage(issue: z.core.$ZodIssue): string {
  const key = typeof issue.path?.[0] === 'string' ? issue.path[0] : null
  const label = (key && fieldLabel[key]) || (key ? `${key[0]?.toUpperCase()}${key.slice(1)}` : 'Request')

  if (issue.code === 'invalid_type') {
    const input = ('input' in issue ? (issue as { input: unknown }).input : undefined) ?? undefined
    if (input === undefined) return key ? `${label} is required` : 'Request body is required'

    const expected = 'expected' in issue ? (issue as { expected: unknown }).expected : null
    if (expected === 'string') return `${label} must be a string`
    if (expected === 'number') return `${label} must be a number`
    if (expected === 'boolean') return `${label} must be a boolean`
    return `${label} is invalid`
  }

  if (issue.code === 'too_small') {
    if ('minimum' in issue && (issue as { minimum: unknown }).minimum === 1) return `${label} is required`
    return `${label} is too short`
  }

  if (issue.code === 'invalid_format') {
    if ('format' in issue && (issue as { format: unknown }).format === 'email') return `${label} is invalid`
    return `${label} is invalid`
  }

  if (issue.code === 'unrecognized_keys') {
    const k = issue.keys?.[0]
    return k ? `Unexpected field: ${k}` : 'Unexpected fields in request'
  }

  return key ? `${label} is invalid` : (issue.message || 'Invalid request')
}

export function zodErrorMessage(err: ZodError): string {
  const issue = err.issues[0]
  if (!issue) return 'Invalid request'
  return zodIssueMessage(issue)
}

function getClientIp(req: Request, connInfo?: Deno.ServeHandlerInfo): string {
  const forwardedFor = req.headers.get('X-Forwarded-For')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  const realIp = req.headers.get('X-Real-IP')
  if (realIp) {
    return realIp.trim()
  }
  if (connInfo?.remoteAddr) {
    const addr = connInfo.remoteAddr
    if (addr.transport === 'tcp') {
      return addr.hostname
    }
  }
  return 'unknown'
}

export function formatApacheLog(req: Request, res: Response, connInfo?: Deno.ServeHandlerInfo): string {
  const ip = getClientIp(req, connInfo)
  const url = new URL(req.url)
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const month = monthNames[now.getMonth()]
  const year = now.getFullYear()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const timezoneOffset = -now.getTimezoneOffset()
  const tzHours = String(Math.floor(Math.abs(timezoneOffset) / 60)).padStart(2, '0')
  const tzMinutes = String(Math.abs(timezoneOffset) % 60).padStart(2, '0')
  const tzSign = timezoneOffset >= 0 ? '+' : '-'
  const timestamp = `${day}/${month}/${year}:${hours}:${minutes}:${seconds} ${tzSign}${tzHours}${tzMinutes}`
  const method = req.method
  const path = url.pathname + url.search
  const httpVersion = 'HTTP/1.1'
  const status = res.status
  const size = res.headers.get('Content-Length') || '-'
  const referer = req.headers.get('Referer') || '-'
  const userAgent = req.headers.get('User-Agent') || '-'

  return `${ip} - - [${timestamp}] "${method} ${path} ${httpVersion}" ${status} ${size} "${referer}" "${userAgent}"`
}

export function corsHeaders(origin?: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  }
}
