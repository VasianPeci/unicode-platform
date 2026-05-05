import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { university: true },
        })

        if (!user || !user.isActive) {
          throw new Error('Invalid credentials')
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!isValid) {
          throw new Error('Invalid credentials')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          universityId: user.universityId,
          universityName: user.university.name,
          totalPoints: user.totalPoints,
          avatarUrl: user.avatarUrl,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.universityId = (user as any).universityId
        token.universityName = (user as any).universityName
        token.totalPoints = (user as any).totalPoints
        token.avatarUrl = (user as any).avatarUrl
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as any
        session.user.universityId = token.universityId as string
        session.user.universityName = token.universityName as string
        session.user.totalPoints = token.totalPoints as number
        session.user.avatarUrl = token.avatarUrl as string | null
      }
      return session
    },
  },
}

// Extend next-auth types
declare module 'next-auth' {
  interface User {
    role: string
    universityId: string
    universityName: string
    totalPoints: number
    avatarUrl?: string | null
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      universityId: string
      universityName: string
      totalPoints: number
      avatarUrl?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    universityId: string
    universityName: string
    totalPoints: number
    avatarUrl?: string | null
  }
}
