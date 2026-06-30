import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const token =
    request.cookies.get('authjs.session-token') ??
    request.cookies.get('__Secure-authjs.session-token')
  const { pathname } = request.nextUrl

  // 공개 경로: 로그인, API 인증
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    if (token && pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // 보호 경로: 토큰 없으면 로그인으로
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
