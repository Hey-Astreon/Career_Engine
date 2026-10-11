import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  serverExternalPackages: ["@libsql/client", "@prisma/adapter-libsql"],
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "astrework.vercel.app",
          },
        ],
        destination: "https://astrework.app/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
