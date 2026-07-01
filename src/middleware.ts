import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    if (pathname.startsWith('/dashboard') && token?.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }

    if (pathname.startsWith('/admin') && token?.role !== 'ADMIN' && token?.role !== 'TEACHER') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    if ((pathname.startsWith('/admin/problems/new') || pathname.startsWith('/admin/contests/new')) && token?.role !== 'TEACHER') {
      return NextResponse.redirect(new URL(token?.role === 'ADMIN' ? '/admin' : '/dashboard', req.url))
    }

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
    '/submissions/:path*',
    '/contests/:path*',
    '/leaderboard/:path*',
    '/admin/:path*',
    '/settings/:path*',
  ],
}
