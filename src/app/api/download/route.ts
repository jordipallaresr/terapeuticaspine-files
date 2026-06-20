import { auth } from "@clerk/nextjs/server";
import { downloadZip } from "client-zip";

import { listObjectKeys } from "@/lib/r2";
import { getBucket } from "@/lib/config";

// El binding R2 sólo existe en tiempo de petición; nada de prerender.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // 1) Sesión de Clerk obligatoria (defensa en profundidad: el middleware ya
  //    protege la ruta, pero aquí devolvemos 401 explícito).
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2) Carpeta solicitada (el query param viene URL-encoded; URL lo decodifica).
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("prefix");
  if (!raw) {
    return new Response("Falta el parámetro 'prefix'", { status: 400 });
  }

  // Nombre limpio: sin barras al inicio/final y sin componentes de ruta raros.
  const folder = raw.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!folder || folder.includes("..")) {
    return new Response("Carpeta no válida", { status: 400 });
  }

  // 3) Listar TODOS los objetos de la carpeta (paginando con cursor).
  const { fullPrefix, keys } = await listObjectKeys(folder);
  if (keys.length === 0) {
    return new Response("La carpeta está vacía o no existe", { status: 404 });
  }

  const bucket = await getBucket();

  // 4) Generador asíncrono: cede los archivos uno a uno para zip en streaming
  //    (memoria constante, sin bufferizar el zip completo).
  async function* files() {
    for (const key of keys) {
      const object = await bucket.get(key);
      if (!object) continue; // borrado entre el list y el get: lo saltamos
      yield {
        // Ruta relativa dentro del zip (sin el prefijo Imagenes/<carpeta>/).
        name: key.slice(fullPrefix.length),
        lastModified: object.uploaded,
        input: object.body as unknown as ReadableStream<Uint8Array>,
      };
    }
  }

  // 5) Respuesta zip en streaming con nombre de archivo correcto (acentos vía
  //    filename* UTF-8, más un fallback ASCII en filename).
  const zipName = `${folder}.zip`;
  const response = downloadZip(files());
  const headers = new Headers(response.headers);
  headers.set(
    "Content-Disposition",
    `attachment; filename="${asciiFallback(zipName)}"; filename*=UTF-8''${encodeURIComponent(
      zipName,
    )}`,
  );

  return new Response(response.body, {
    status: 200,
    headers,
  });
}

/** Sustituye caracteres no ASCII por '_' para el filename clásico. */
function asciiFallback(name: string): string {
  // eslint-disable-next-line no-control-regex
  return name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
}
