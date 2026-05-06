import { NextRequest, NextResponse } from 'next/server';

const ACCESS_COOKIE = 'eco_access_token';

export function middleware(request: NextRequest) {
  // TODO: Sem teste - middleware de rota do Next.js.
  const hasToken = Boolean(request.cookies.get(ACCESS_COOKIE)?.value);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/dashboard') && !hasToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (pathname === '/login' && hasToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
