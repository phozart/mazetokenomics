import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  // If user is NOT logged in and visits root, redirect to welcome page
  if (!token && pathname === '/') {
    return NextResponse.redirect(new URL('/welcome', request.url));
  }

  // If user IS logged in and visits welcome or login, redirect to dashboard
  if (token && (pathname === '/welcome' || pathname === '/login')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/welcome'],
};
