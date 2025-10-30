import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  ...(basePath && {
    basePath: basePath,
    assetPrefix: basePath,
  }),
  ...(isProduction && {
    output: "export",
    images: {
      unoptimized: true,
    },
  }),
  // Note: headers() is not supported in static export mode
  // Headers should be configured at the hosting level (e.g., GitHub Pages)
  ...(!isProduction && {
    headers() {
      // Required by FHEVM 
      return Promise.resolve([
        {
          source: '/',
          headers: [
            {
              key: 'Cross-Origin-Opener-Policy',
              value: 'same-origin',
            },
            {
              key: 'Cross-Origin-Embedder-Policy',
              value: 'require-corp',
            },
          ],
        },
      ]);
    },
  }),
};

export default nextConfig;

