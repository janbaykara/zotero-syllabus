import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  // Disable Turbopack for compatibility with PayloadCMS
  // turbo: false is deprecated, use --no-turbopack flag or next dev without turbo
};

export default withPayload(nextConfig);
