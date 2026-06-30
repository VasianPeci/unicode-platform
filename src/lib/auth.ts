import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/emailVerification'

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

        const normalizedEmail = normalizeEmail(credentials.email)

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: { university: true },
        })

        if (!user) {
          throw new Error('Invalid credentials')
        }

        if (!user.emailVerifiedAt && !user.isActive) {
          throw new Error('EMAIL_NOT_VERIFIED')
        }

        if (!user.isActive) {
          throw new Error('ACCOUNT_PENDING_APPROVAL')
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
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.email = user.email
        token.role = (user as any).role
        token.universityId = (user as any).universityId
        token.universityName = (user as any).universityName
        token.totalPoints = (user as any).totalPoints
        token.avatarUrl = (user as any).avatarUrl
      }

      if (trigger === 'update' && token.id) {
        const refreshedUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: { university: true },
        })

        if (refreshedUser) {
          token.name = refreshedUser.name
          token.email = refreshedUser.email
          token.role = refreshedUser.role
          token.universityId = refreshedUser.universityId
          token.universityName = refreshedUser.university.name
          token.totalPoints = refreshedUser.totalPoints
          token.avatarUrl = refreshedUser.avatarUrl
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.name = token.name as string
        session.user.email = token.email as string
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
