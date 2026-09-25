import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

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

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
