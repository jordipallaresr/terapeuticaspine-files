import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { BASE_PREFIX, getBucket } from "./config";
import {
  listFoldersFromR2,
  readFolderCache,
  writeFolderCache,
} from "./folder-cache";

/**
 * Lists ALL top-level folders under BASE_PREFIX.
 *
 * Fast path: returns the listing cached in KV by the cron (see `worker.ts`),
 * refreshed hourly, so the page doesn't hit R2 on each request.
 * Fallback: on a cache miss (first deploy, expired TTL, cron not run yet) it
 * lists live from R2 and repopulates the cache for the next request.
 */
export async function listFolders(): Promise<string[]> {
  const { env } = await getCloudflareContext({ async: true });

  const cached = await readFolderCache(env.FOLDERS_CACHE);
  if (cached) return cached.folders;

  const folders = await listFoldersFromR2(env.IMAGENES_BUCKET, BASE_PREFIX);
  try {
    await writeFolderCache(env.FOLDERS_CACHE, folders, new Date().toISOString());
  } catch {
    // Non-fatal: still return the live result even if the cache write fails.
  }
  return folders;
}

/**
 * Lists the keys of all objects inside a specific folder, paginating with a
 * cursor until the end. Excludes folder "markers" (keys that end in "/").
 * `folder` is the clean name (without prefix or slashes).
 */
export async function listObjectKeys(folder: string): Promise<{
  fullPrefix: string;
  keys: string[];
}> {
  const bucket = await getBucket();
  const fullPrefix = `${BASE_PREFIX}${folder}/`;
  const keys: string[] = [];
  let cursor: string | undefined;

  do {
    const res = await bucket.list({ prefix: fullPrefix, cursor });
    for (const obj of res.objects) {
      if (!obj.key.endsWith("/") && obj.size > 0) keys.push(obj.key);
    }
    cursor = res.truncated ? res.cursor : undefined;
  } while (cursor);

  return { fullPrefix, keys };
}
