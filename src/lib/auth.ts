import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { supabase } from './supabase'
import type { Role } from './types'

declare module 'next-auth' {
  interface User {
    role: Role
    id: string
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: Role
    }
  }
}

declare module 'next-auth' {
  interface JWT {
    id: string
    role: Role
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: '이메일', type: 'email' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string
        const password = credentials?.password as string

        if (!email || !password) return null

        const { data: user, error } = await supabase
          .from('users')
          .select('id, email, name, password, role, is_active')
          .eq('email', email)
          .single()

        if (error || !user || !user.is_active) return null

        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as Role,
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      // 구글 로그인 시: DB에 등록된 이메일인지 확인 (등록된 직원만 허용)
      if (account?.provider === 'google') {
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, is_active')
          .eq('email', user.email)
          .single()

        if (!dbUser || !dbUser.is_active) {
          // 등록되지 않았거나 비활성 직원이면 로그인 차단
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      // 최초 로그인 시 (credentials 또는 google)
      if (user) {
        if (account?.provider === 'google') {
          // 구글 로그인: DB에서 직원 정보 조회
          const { data: dbUser } = await supabase
            .from('users')
            .select('id, role')
            .eq('email', user.email)
            .single()

          if (dbUser) {
            token.id = dbUser.id as string
            token.role = dbUser.role as Role
          }
        } else {
          // 이메일/비밀번호 로그인
          token.id = user.id as string
          token.role = user.role as Role
        }
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as Role
      return session
    },
  },
})
