import "server-only";
import { BASE_PREFIX, getBucket } from "./config";

/**
 * Lists ALL top-level folders under BASE_PREFIX, paginating with a cursor until
 * the end (it doesn't stop at the first page of 1000). Returns the "clean" names
 * (without the prefix or trailing slash), sorted alphabetically.
 */
export async function listFolders(): Promise<string[]> {
  const bucket = await getBucket();
  const folders: string[] = [];
  let cursor: string | undefined;

  do {
    const res = await bucket.list({
      prefix: BASE_PREFIX,
      delimiter: "/",
      cursor,
    });

    for (const prefix of res.delimitedPrefixes) {
      const name = prefix.slice(BASE_PREFIX.length).replace(/\/+$/, "");
      if (name) folders.push(name);
    }

    cursor = res.truncated ? res.cursor : undefined;
  } while (cursor);

  folders.sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base", numeric: true }),
  );

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
