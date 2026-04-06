import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const role = request.cookies.get('userRole')?.value;
  const path = request.nextUrl.pathname;
  const loginUrl = new URL('/login', request.url);

  // 1. /admin/* — faqat ADMIN
  if (path.startsWith('/admin')) {
    if (!role) return NextResponse.redirect(loginUrl);
    if (role !== 'ADMIN') return NextResponse.redirect(new URL('/', request.url));
  }

  // 2. /touch/* — ADMIN yoki MANAGER
  if (path.startsWith('/touch')) {
    if (!role) return NextResponse.redirect(loginUrl);
    if (role !== 'ADMIN' && role !== 'MANAGER') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // 3. /work-log — ADMIN yoki MANAGER
  if (path.startsWith('/work-log')) {
    if (!role) return NextResponse.redirect(loginUrl);
    if (role !== 'ADMIN' && role !== 'MANAGER') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/touch/:path*', '/work-log/:path*'],
};
