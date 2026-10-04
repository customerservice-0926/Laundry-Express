import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { UserDbService } from "@/lib/services/user-db-service";
import { consumeRateLimit } from "@/lib/security/rate-limit";

/**
 * NextAuth Configuration & Authentication Options
 * Primary enterprise authentication architecture for Laundry Express:
 * - Dynamic credentials verification against Supabase public.users
 * - Google OAuth authentication with database role synchronization
 * - Dynamic role retrieval (admin can be any email configured in database)
 * - JWT session strategy with role extraction ('admin' | 'customer')
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: "admin" | "customer";
      phone?: string;
    };
  }

  interface User {
    id: string;
    role: "admin" | "customer";
    phone?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "admin" | "customer";
    phone?: string;
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    // Credentials Provider verified against database
    CredentialsProvider({
      id: "credentials",
      name: "Laundry Express Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter both email and password.");
        }

        const allowed = await consumeRateLimit(
          req as Parameters<typeof consumeRateLimit>[0],
          "auth_login",
          5,
          60,
          credentials.email
        );
        if (!allowed) {
          throw new Error("Too many login attempts. Please wait 60 seconds before trying again.");
        }

        const result = await UserDbService.verifyCredentialsWithStatus(
          credentials.email,
          credentials.password
        );

        if (!result.success || !result.user) {
          throw new Error(result.error || "Invalid email or password.");
        }

        const verifiedUser = result.user;

        return {
          id: verifiedUser.id,
          name: verifiedUser.full_name,
          email: verifiedUser.email,
          image: verifiedUser.avatar_url || null,
          role: verifiedUser.role,
          phone: verifiedUser.phone,
        };
      },
    }),

    // Google OAuth Provider with dynamic role synchronization
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: false,
      async profile(profile) {
        const normalizedEmail = profile.email?.trim().toLowerCase() || "";
        let role: "admin" | "customer" = "customer";
        let dbUserId = profile.sub;
        let dbFullName = profile.name || "Google Customer";
        let dbPhone: string | undefined;

        try {
          const existing = await UserDbService.getUserByEmail(normalizedEmail);
          if (existing) {
            role = existing.role || "customer";
            dbUserId = existing.id;
            dbFullName = existing.full_name || dbFullName;
            dbPhone = existing.phone || undefined;
          }
          const dbUser = await UserDbService.syncUser({
            id: profile.sub,
            email: normalizedEmail,
            name: dbFullName,
            role,
            image: profile.picture,
          });
          if (dbUser) {
            dbUserId = dbUser.id || dbUserId;
            dbFullName = dbUser.full_name || dbFullName;
            role = dbUser.role || role;
            dbPhone = dbUser.phone || dbPhone;
          }
        } catch (err) {
          console.error("Google profile sync error:", err);
        }

        return {
          id: dbUserId,
          name: dbFullName,
          email: normalizedEmail,
          image: profile.picture || null,
          role,
          phone: dbPhone,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (user?.email) {
        try {
          const synchronized = await UserDbService.syncUser({
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            avatar_url: user.image || undefined,
          });
          if (synchronized) {
            user.id = synchronized.id;
            user.role = synchronized.role;
            user.phone = synchronized.phone || undefined;
          }
        } catch (err) {
          console.error("signIn callback sync error:", err);
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role || "customer";
        token.phone = user.phone;
        token.picture = user.image || token.picture;
        token.email = user.email || token.email;
        token.name = user.name || token.name;
      }

      if (!token.id && token.sub) {
        token.id = token.sub;
      }

      if (token.id || token.email) {
        try {
          let activeUser = token.id ? await UserDbService.getActiveUserById(String(token.id)) : null;
          if (!activeUser && token.email) {
            activeUser = await UserDbService.getUserByEmail(String(token.email));
          }
          if (activeUser) {
            token.id = activeUser.id;
            token.role = activeUser.role;
            token.email = activeUser.email;
            token.name = activeUser.full_name;
            token.phone = activeUser.phone || undefined;
            token.picture = activeUser.avatar_url || token.picture;
          }
        } catch (err) {
          console.error("JWT user refresh error:", err);
        }
      }

      if (trigger === "update" && session) {
        if (session.image) token.picture = session.image;
        if (session.avatar_url) token.picture = session.avatar_url;
        if (session.name) token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string) || "";
        session.user.role = (token.role as "admin" | "customer") || "customer";
        session.user.phone = token.phone;
        session.user.email = (token.email as string) || session.user.email || "";
        session.user.name = (token.name as string) || session.user.name || "Customer";
        session.user.image = (token.picture as string) || session.user.image || null;
      }
      return session;
    },
  },
};
