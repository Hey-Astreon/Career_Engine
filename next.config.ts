import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
