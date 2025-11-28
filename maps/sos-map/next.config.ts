import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return {
      beforeFiles: [
        // When accessing from demo.whisppr.us, serve the trigger page as homepage
        {
          source: '/',
          has: [{ type: 'host', value: 'demo.whisppr.us' }],
          destination: '/trigger',
        },
      ],
    };
  },
};

export default nextConfig;
