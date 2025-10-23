import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function isTokenExpired(token: string | undefined): boolean {
  if (!token) return true;
  const parts = token.split('.')
  if (parts.length < 2) return true;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    if (typeof atob !== 'function') return true;
    const json = atob(base64);
    const payload = JSON.parse(json);
    if (typeof payload.exp !== 'number') return true;
    const nowSec = Math.floor(Date.now() / 1000);
    return payload.exp <= nowSec;
  } catch {
    return true;
  }
}

export function middleware(request: NextRequest) {
  // Get the token from cookies
  const token = request.cookies.get('authToken')?.value;

  // Define protected routes
  const protectedRoutes = ['/dashboard'];
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  const invalidOrExpired = !token || isTokenExpired(token);

  // If accessing a protected route without a valid token, redirect to login
  if (isProtectedRoute && invalidOrExpired) {
    const res = NextResponse.redirect(new URL('/login', request.url));
    // Clear cookie to avoid loops
    res.cookies.set('authToken', '', { path: '/', maxAge: 0 });
    return res;
  }

  const hasValidToken = !!token && !invalidOrExpired;

  // If accessing login page with a valid token, redirect to dashboard
  if (request.nextUrl.pathname === '/login' && hasValidToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
