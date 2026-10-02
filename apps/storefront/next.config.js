/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/api-client"],
  // Same-origin API access for the browser (works through tunnels / reverse proxies).
  async rewrites() {
    const apiUrl = process.env.API_URL || "http://localhost:4000";
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

module.exports = nextConfig;
