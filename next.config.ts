import type { NextConfig } from "next";

// OpenNext: initializes the Cloudflare context (R2 bindings, etc.) in `next dev`.
// Must be called BEFORE defining/exporting the config.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // Images are served as zip downloads; we don't need the optimizer.
  images: { unoptimized: true },
};

export default nextConfig;
