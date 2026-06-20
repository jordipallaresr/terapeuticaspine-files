import type { NextConfig } from "next";

// OpenNext: inicializa el contexto de Cloudflare (bindings R2, etc.) en `next dev`.
// Debe llamarse ANTES de definir/exportar la config.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // Las imágenes se sirven como descargas zip; no necesitamos el optimizador.
  images: { unoptimized: true },
};

export default nextConfig;
