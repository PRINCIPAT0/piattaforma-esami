import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;
  const path = request.nextUrl.pathname;

  // Rotte protette
  const isDocenteRoute = path.startsWith('/dashboard-docente');
  const isStudenteRoute = path.startsWith('/dashboard-studente');

  if (isDocenteRoute || isStudenteRoute) {
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard-docente/:path*', '/dashboard-studente/:path*'],
};