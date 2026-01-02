import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Configure resolve conditions to prefer 'import' over 'react-server'
    // This ensures client components use the correct SWR bundle
    if (!isServer) {
      config.resolve.conditionNames = ["import", "require", "default"];
      config.resolve.alias = {
        ...config.resolve.alias,
        swr: require.resolve("swr/dist/index/index.mjs"),
      };
    } else {
      // For server, also prefer 'import' to avoid react-server condition
      config.resolve.conditionNames = ["import", "require", "default"];
    }
    return config;
  },
  // Turbopack config (Next.js 16 default)
  turbopack: {
    resolveAlias: {
      swr: "swr/dist/index/index.mjs",
    },
  },
};

export default withPayload(nextConfig);
