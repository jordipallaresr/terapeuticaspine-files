import "server-only";
import { BASE_PREFIX, getBucket } from "./config";

/**
 * Lista TODAS las carpetas de primer nivel bajo BASE_PREFIX, paginando con
 * cursor hasta el final (no se queda en la primera página de 1000). Devuelve los
 * nombres "limpios" (sin el prefijo ni la barra final), ordenados alfabéticamente.
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
 * Lista las claves (keys) de todos los objetos dentro de una carpeta concreta,
 * paginando con cursor hasta el final. Excluye "marcadores" de carpeta (keys que
 * terminan en "/"). `folder` es el nombre limpio (sin prefijo ni barras).
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
