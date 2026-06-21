// Folder-listing cache (KV).
//
// The home page lists every top-level folder under BASE_PREFIX (~2500), which
// costs several R2 `list` calls. To avoid paying that on every request, a Cron
// Trigger refreshes this listing in KV every hour (see `worker.ts`) and the
// page reads from KV, falling back to a live R2 listing on a cache miss.
//
// IMPORTANT: this module must NOT import `server-only` or `@opennextjs/cloudflare`.
// It is imported by the custom Worker entrypoint (`worker.ts`), which is bundled
// by Wrangler (not Next), so those imports would break the scheduled handler.

const DEFAULT_BASE_PREFIX = "Imagenes anteriores/";
const CACHE_KEY = "folders:list";
// Safety TTL: if the cron stops running, the entry expires and we fall back to
// a live R2 listing. The cron runs hourly, so 3 h leaves margin for a missed run.
const CACHE_TTL_SECONDS = 60 * 60 * 3;

export interface CachedFolders {
  folders: string[];
  refreshedAt: string; // ISO timestamp of the last refresh
}

/**
 * Normalizes a prefix to exactly one trailing slash and no leading slash.
 * Empty input yields an empty string (root listing).
 */
export function normalizePrefix(prefix: string): string {
  const trimmed = prefix.replace(/^\/+/, "").replace(/\/+$/, "");
  return trimmed.length ? `${trimmed}/` : "";
}

/**
 * Lists ALL top-level folders under `basePrefix` directly from R2, paginating
 * with a cursor until the end. Returns the "clean" names (without the prefix or
 * trailing slash), sorted alphabetically. This is the source of truth for both
 * the cron refresh and the cache-miss fallback.
 */
export async function listFoldersFromR2(
  bucket: R2Bucket,
  basePrefix: string,
): Promise<string[]> {
  const folders: string[] = [];
  let cursor: string | undefined;

  do {
    const res = await bucket.list({
      prefix: basePrefix,
      delimiter: "/",
      cursor,
    });

    for (const prefix of res.delimitedPrefixes) {
      const name = prefix.slice(basePrefix.length).replace(/\/+$/, "");
      if (name) folders.push(name);
    }

    cursor = res.truncated ? res.cursor : undefined;
  } while (cursor);

  folders.sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base", numeric: true }),
  );

  return folders;
}

/** Reads the cached folder list from KV (null if absent or unparseable). */
export async function readFolderCache(
  kv: KVNamespace,
): Promise<CachedFolders | null> {
  const cached = await kv.get<CachedFolders>(CACHE_KEY, "json");
  return cached ?? null;
}

/** Writes the folder list to KV with the safety TTL. */
export async function writeFolderCache(
  kv: KVNamespace,
  folders: string[],
  refreshedAt: string,
): Promise<void> {
  const value: CachedFolders = { folders, refreshedAt };
  await kv.put(CACHE_KEY, JSON.stringify(value), {
    expirationTtl: CACHE_TTL_SECONDS,
  });
}

/**
 * Cron entrypoint: lists folders from R2 and stores them in KV. Receives the
 * Worker `env` directly because the scheduled handler has no request context.
 */
export async function refreshFolderCache(env: CloudflareEnv): Promise<void> {
  const basePrefix = normalizePrefix(env.BASE_PREFIX ?? DEFAULT_BASE_PREFIX);
  const folders = await listFoldersFromR2(env.IMAGENES_BUCKET, basePrefix);
  const refreshedAt = new Date().toISOString();
  await writeFolderCache(env.FOLDERS_CACHE, folders, refreshedAt);

  // Audit/diagnostics line (visible in Worker logs).
  console.log(
    JSON.stringify({
      event: "folder_cache_refresh",
      at: refreshedAt,
      folders: folders.length,
    }),
  );
}
