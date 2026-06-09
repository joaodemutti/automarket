import { SignJWT, jwtVerify } from 'jose'
import type { NextRequest } from 'next/server'

const encodedKey = new TextEncoder().encode(process.env.JWT_SECRET ?? 'fallback_dev_secret')

export interface JwtPayload {
  id: string
  nome: string
}

export async function signJwt(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? '7d')
    .sign(encodedKey)
}

export async function verifyJwt(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, encodedKey)
  return payload as unknown as JwtPayload
}

export async function signWsToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('60s')
    .sign(encodedKey)
}

export function setCookie(headers: Headers, token: string): void {
  const maxAge = 7 * 24 * 60 * 60 // 7 days in seconds
  headers.append(
    'Set-Cookie',
    `token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`
  )
}

export function clearCookie(headers: Headers): void {
  headers.append(
    'Set-Cookie',
    'token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
  )
}

export async function requireAuth(request: NextRequest): Promise<JwtPayload> {
  const token = request.cookies.get('token')?.value
  if (!token) {
    throw Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    return await verifyJwt(token)
  } catch {
    throw Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
