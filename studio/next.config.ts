import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Enable experimental features for proxy functionality
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Allow loading external images from any domain (for project previews)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Headers for iframe embedding
  async headers() {
    return [
      {
        source: "/api/proxy/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ]
  },
}

export default nextConfig
