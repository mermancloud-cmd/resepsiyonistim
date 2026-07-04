import { type NextRequest } from "next/server"
import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Telefon Doğrulama",
      credentials: {
        phone: {
          label: "Telefon Numarası",
          type: "tel",
          placeholder: "+90 5XX XXX XXXX",
        },
        otp: {
          label: "Doğrulama Kodu",
          type: "text",
          placeholder: "6 haneli kod",
        },
      },
      async authorize(credentials) {
        // Mock OTP validation — accept any 6-digit code for development
        // In production, verify against SMS service (e.g., Twilio, Twillio)
        if (!credentials?.phone || !credentials?.otp) {
          return null;
        }

        // Mock: accept "123456" as valid OTP for any phone number
        const isValidOtp = credentials.otp.length === 6;

        if (!isValidOtp) {
          return null;
        }

        // Mock: return a user object
        // In production, look up user from database
        return {
          id: "user-001",
          name: "Bungalow Sahibi",
          email: `owner@bungalow-panel.app`,
          phone: credentials.phone,
          role: "owner",
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = user as any;
        token.phone = u.phone;
        token.role = u.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = session.user as any;
        s.id = token.id;
        s.phone = token.phone;
        s.role = token.role;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
