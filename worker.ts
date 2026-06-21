// Custom Worker entrypoint.
//
// OpenNext generates `.open-next/worker.js` which only exports a `fetch`
// handler. To run a Cron Trigger we also need a `scheduled` handler, so this
// custom entrypoint re-uses the generated fetch handler and adds `scheduled`.
// `wrangler.jsonc` -> `main` points here.
//
// The `.open-next/worker.js` file only exists after `opennextjs-cloudflare
// build`, so this file is excluded from `next build` typecheck (see tsconfig).
//
// Docs: https://opennext.js.org/cloudflare/howtos/custom-worker

// @ts-ignore - generated at build time by `opennextjs-cloudflare build`.
import { default as openNextHandler } from "./.open-next/worker.js";

import { refreshFolderCache } from "./src/lib/folder-cache";

export default {
  fetch: openNextHandler.fetch,

  // Cron Trigger (see `triggers.crons` in wrangler.jsonc): hourly refresh of the
  // cached folder listing in KV so page loads don't hit R2 on every request.
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(refreshFolderCache(env));
  },
} satisfies ExportedHandler<CloudflareEnv>;

// Re-export any Durable Objects / named exports the generated worker defines.
// @ts-ignore - generated at build time by `opennextjs-cloudflare build`.
export * from "./.open-next/worker.js";
