import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  serverExternalPackages: ["@libsql/client", "@prisma/adapter-libsql"],
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
