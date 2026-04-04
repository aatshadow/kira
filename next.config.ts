import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/jarvis/stream',
        destination: `${process.env.JARVIS_API_URL || 'http://127.0.0.1:8000'}/v1/chat/completions`,
      },
    ]
  },
};

export default nextConfig;
