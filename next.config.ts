import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ufc/costing"],
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  devIndicators: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
