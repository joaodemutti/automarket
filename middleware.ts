import { jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

const encodedKey = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback_dev_secret'
)

const PRIVATE_PAGE_PATTERN = /^\/(private)\//
const AUTH_ONLY_PAGE_PATTERN = /^\/(login|register)$/
const AUTH_REQUIRED_API_PATTERN =
  /^\/api\/(auth\/ws-token|veiculos\/[^/]+\/compra|veiculos\/[^/]+\/mensagens|veiculos\/[^/]+\/interessados)/

async function verifyToken(token: string) {
  try {
    await jwtVerify(token, encodedKey)
    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPrivatePage = PRIVATE_PAGE_PATTERN.test(pathname)
  const isAuthOnlyPage = AUTH_ONLY_PAGE_PATTERN.test(pathname)
  const isAuthRequiredApi = AUTH_REQUIRED_API_PATTERN.test(pathname)

  const token = request.cookies.get('token')?.value
  const valid = token ? await verifyToken(token) : false

  if (isAuthOnlyPage && valid) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (!isPrivatePage && !isAuthRequiredApi) {
    return NextResponse.next()
  }

  if (!valid) {
    if (isPrivatePage) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/(private)/:path*',
    '/login',
    '/register',
    '/api/auth/ws-token',
    '/api/veiculos/:path*/compra',
    '/api/veiculos/:path*/mensagens',
    '/api/veiculos/:path*/interessados',
  ],
}
