import { auth, currentUser } from "@clerk/nextjs/server";
import { downloadZip } from "client-zip";

import { listObjectKeys } from "@/lib/r2";
import { getBucket } from "@/lib/config";

// The R2 binding only exists at request time; no prerender.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // 1) Clerk session required (defense in depth: the middleware already protects
  //    the route, but here we return an explicit 401).
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // User's email for the download audit.
  const user = await currentUser();
  const email =
    user?.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    null;

  // 2) Requested folder (the query param comes URL-encoded; URL decodes it).
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("prefix");
  if (!raw) {
    return new Response("Falta el parámetro 'prefix'", { status: 400 });
  }

  // Clean name: no leading/trailing slashes and no weird path components.
  const folder = raw.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!folder || folder.includes("..")) {
    return new Response("Carpeta no válida", { status: 400 });
  }

  // 3) List ALL objects in the folder (paginating with a cursor).
  const { fullPrefix, keys } = await listObjectKeys(folder);
  if (keys.length === 0) {
    return new Response("La carpeta está vacía o no existe", { status: 404 });
  }

  // 3b) AUDIT: logs who downloads which patient. Appears in the Worker logs
  //     (observability enabled in wrangler.jsonc; view with `wrangler tail`
  //     or in the dashboard → Worker → Logs). JSON line so it can be filtered.
  console.log(
    JSON.stringify({
      event: "zip_download",
      at: new Date().toISOString(),
      patient: folder,
      userEmail: email,
      userId,
      files: keys.length,
    }),
  );

  const bucket = await getBucket();

  // 4) Async generator: yields the files one by one for streaming zip
  //    (constant memory, without buffering the entire zip).
  async function* files() {
    for (const key of keys) {
      const object = await bucket.get(key);
      if (!object) continue; // deleted between the list and the get: skip it
      yield {
        // Relative path inside the zip (without the BASE_PREFIX/<folder>/ prefix).
        name: key.slice(fullPrefix.length),
        lastModified: object.uploaded,
        input: object.body as unknown as ReadableStream<Uint8Array>,
      };
    }
  }

  // 5) Streaming zip response with the correct filename (accents via
  //    filename* UTF-8, plus an ASCII fallback in filename).
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

/** Replaces non-ASCII characters with '_' for the classic filename. */
function asciiFallback(name: string): string {
  // eslint-disable-next-line no-control-regex
  return name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
}
