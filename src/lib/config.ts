import { getCloudflareContext } from "@opennextjs/cloudflare";

// R2Bucket es un tipo global generado por `pnpm cf-typegen` (cloudflare-env.d.ts).

/**
 * Prefijo base dentro del bucket bajo el que viven las carpetas de imágenes.
 * Configurable por entorno (BASE_PREFIX) por si reorganizas el bucket.
 * Se normaliza para garantizar exactamente una barra final y ninguna inicial.
 */
export const BASE_PREFIX: string = normalizePrefix(
  process.env.BASE_PREFIX ?? "Imagenes/",
);

function normalizePrefix(prefix: string): string {
  const trimmed = prefix.replace(/^\/+/, "").replace(/\/+$/, "");
  return trimmed.length ? `${trimmed}/` : "";
}

/**
 * Devuelve el binding de R2. El nombre del binding (IMAGENES_BUCKET) se define
 * en wrangler.jsonc; si lo renombras, cámbialo aquí en un único sitio.
 *
 * Usa el modo `async` de getCloudflareContext: es el que funciona en cualquier
 * contexto (Server Components en `next dev`, remote bindings) y también en
 * producción.
 */
export async function getBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  const bucket = env.IMAGENES_BUCKET;
  if (!bucket) {
    throw new Error(
      "El binding R2 'IMAGENES_BUCKET' no está disponible. Revisa wrangler.jsonc " +
        "y que estés ejecutando dentro del contexto de Cloudflare.",
    );
  }
  return bucket;
}
