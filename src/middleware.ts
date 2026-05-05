import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Admin-only routes
    if (pathname.startsWith('/admin') && token?.role !== 'ADMIN' && token?.role !== 'TEACHER') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Strict admin-only
    if ((pathname === '/admin' || pathname.startsWith('/admin/teachers') || pathname.startsWith('/admin/students')) && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/problems/:path*',
    '/contests/:path*',
    '/leaderboard/:path*',
    '/admin/:path*',
  ],
}
