import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// Sanitize legacy NEXTAUTH_URL from older project settings
if (
  !process.env.NEXTAUTH_URL ||
  process.env.NEXTAUTH_URL.includes("career-engine")
) {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  } else if (process.env.NODE_ENV === "production") {
    process.env.NEXTAUTH_URL = "https://astrework.vercel.app";
  }
}
if (
  process.env.NEXTAUTH_URL_INTERNAL &&
  process.env.NEXTAUTH_URL_INTERNAL.includes("career-engine")
) {
  process.env.NEXTAUTH_URL_INTERNAL = process.env.NEXTAUTH_URL;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as NextAuthOptions["adapter"],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
      allowDangerousEmailAccountLinking: true,
      userinfo: {
        url: "https://api.github.com/user",
        async request({ client, tokens }) {
          const profile = await client.userinfo(tokens.access_token!);
          if (!profile.email) {
            try {
              const res = await fetch("https://api.github.com/user/emails", {
                headers: {
                  Authorization: `Bearer ${tokens.access_token}`,
                  "User-Agent": "AstreWork-OAuth-Client",
                  Accept: "application/vnd.github.v3+json",
                },
              });
              if (res.ok) {
                const emails = (await res.json()) as Array<{
                  email: string;
                  primary: boolean;
                  verified: boolean;
                }>;
                if (Array.isArray(emails) && emails.length > 0) {
                  const selected =
                    emails.find((e) => e.primary && e.verified)?.email ||
                    emails.find((e) => e.verified)?.email ||
                    emails.find((e) => e.primary)?.email ||
                    emails[0]?.email;
                  if (selected) {
                    profile.email = selected;
                  }
                }
              }
            } catch (err) {
              console.error("[GitHub OAuth] Failed to fetch user emails:", err);
            }
          }
          if (!profile.email && profile.login) {
            profile.email = `${profile.login}@users.noreply.github.com`;
          }
          return profile;
        },
      },
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER || "",
      from: process.env.EMAIL_FROM || "noreply@astrework.com",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    newUser: "/onboard", // Redirect new users to onboarding
  },
  callbacks: {
    async signIn({ user, account }) {
      console.log(`[NextAuth] Successful authorization with provider: ${account?.provider}, email: ${user?.email}`);
      return true;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  debug: process.env.NODE_ENV !== "production" || process.env.NEXTAUTH_DEBUG === "true",
};
