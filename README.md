# Terapeutica Spine SL — Image archive

Internal, private web app to **list, search and download** patient image folders
stored in **Cloudflare R2**. The whole app sits behind **Clerk**: with no session
you can't see or download anything.

**Production:** https://im.terapeuticaspine.com

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- Deployed to **Cloudflare Workers** with **`@opennextjs/cloudflare`** (OpenNext)
- **Clerk** (`@clerk/nextjs`) for authentication
- **shadcn/ui** + **Tailwind CSS v4** + **lucide-react** for the UI
- **R2 via the Worker's native binding** (no S3 SDK)
- **`client-zip`** to generate the ZIP as a stream (constant memory)

## How it works

- The home page (`/`) lists every top-level folder under the `Imagenes anteriores/` prefix in
  the R2 bucket, paginating with `cursor` to the end (~2500 folders). Names are
  shown clean (without the prefix or trailing slash) and Title-Cased.
- Search filters by substring, **case- and accent-insensitive, on the client**
  (instant). All names are loaded once on the server and filtered in the browser.
- Clicking a folder downloads a **ZIP with all its files** via
  `GET /api/download?prefix=<url-encoded-folder>`. The endpoint verifies the Clerk
  session (401 if missing), lists the objects with pagination, and streams the zip
  with relative paths inside it.
- Every download writes an audit log line (see **Audit logs** below).

---

## Deployment — fully automatic (GitHub → Cloudflare)

This project deploys **automatically** through **Cloudflare Workers Builds**.
**There are no manual deploy commands to run** — you never run `wrangler deploy`
from your machine.

- Every push to **`main`** on GitHub triggers a build + deploy in Cloudflare.
- Build command (set in the dashboard): `pnpm exec opennextjs-cloudflare build`
- Deploy command (set in the dashboard): `pnpm exec wrangler deploy`
- pnpm version is pinned via the `packageManager` field (`pnpm@11.1.1`) so CI
  matches the lockfile.
- Production is served at the custom domain **https://im.terapeuticaspine.com**
  (mapped to the Worker in Cloudflare → Worker → Domains & Routes).

### Environment variables (set once in the Cloudflare dashboard)

Clerk keys are needed in **TWO** places or the build/runtime fails:

1. **Build** → Worker → **Settings → Build → Build variables and secrets**:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (baked into the client bundle at build —
     mandatory here)
   - `CLERK_SECRET_KEY`
   - `NODE_VERSION` = `22`
2. **Runtime** → Worker → **Settings → Variables and Secrets**:
   - `CLERK_SECRET_KEY` (Secret) — used to verify sessions on every request
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

`BASE_PREFIX` does not need to be set here: it's defined in `wrangler.jsonc`
(`vars`). Runtime secrets persist across deploys (set once).

---

## Authentication (Clerk) — email + OTP only

Sign-in is a **custom form** (email → OTP code), not Clerk's hosted widget, and
access is restricted to `@terapeuticaspine.com` addresses (client-side check;
the real gate is who has a Clerk account). Dashboard config:

1. **User & Authentication → Email, Phone, Username**:
   - **Email address**: enabled.
   - Verification: enable **"Email verification code"** (the OTP).
   - **Password**: off. **Username** and **Phone**: off.
2. **SSO Connections / Social providers**: all off (the form only uses email + OTP).
3. **No public sign-up.** Add staff from the Clerk dashboard (**Users → invite**)
   or via **Restrictions → Allowlist**. The app does not expose `/sign-up`.
4. The sign-in route is `/sign-in`.

---

## R2 bucket

The binding is already declared in `wrangler.jsonc`:

```jsonc
"r2_buckets": [
  {
    "binding": "IMAGENES_BUCKET",
    "bucket_name": "onedrive-backup",
    "jurisdiction": "eu",
    "remote": true
  }
]
```

- `binding` = how the code accesses it (`env.IMAGENES_BUCKET`). Don't rename unless
  you also change it in the code.
- `bucket_name` = the real bucket name in your account.
- `jurisdiction: "eu"` = the bucket lives in the EU jurisdiction (required to find it).
- `remote: true` = in local dev/preview the binding connects to the **real** bucket
  instead of the empty local simulator (ignored in production).
- Folders must live under `Imagenes anteriores/` (the `BASE_PREFIX` var). The bucket is **not**
  public: all access goes through the authenticated app.

---

## Local development

```bash
cp .env.example .env.local      # fill in Clerk keys
cp .dev.vars.example .dev.vars  # same values, used by `pnpm preview`
pnpm install
pnpm wrangler login             # needed for the remote R2 binding (real data)
pnpm dev                        # Next dev at http://localhost:3000
pnpm preview                    # OpenNext build + Cloudflare simulator (workerd)
```

Local variables live in two files: `.env.local` (used by `pnpm dev`) and
`.dev.vars` (used by `pnpm preview`). Both are git-ignored.

> A `deploy` script exists in `package.json`, but you don't need it: deploys are
> automatic on push (see above). Use it only for an exceptional manual deploy.

---

## Audit logs — downloads

Every download emits a structured JSON line in the Worker logs (observability is
enabled in `wrangler.jsonc`):

```json
{ "event": "zip_download", "at": "...", "patient": "<folder>", "userEmail": "...", "userId": "...", "files": 42 }
```

View them live with `pnpm wrangler tail`, or in the dashboard → Worker → **Logs**
(filter by `event = zip_download`). Note: Worker observability logs are retained
for a limited time; for a permanent, queryable audit trail consider persisting to
Workers Analytics Engine, D1, or Logpush to R2.

---

## Next.js 16 note (middleware vs proxy)

Next 16 deprecated the `middleware.ts` convention in favor of `proxy.ts`. We use
**`middleware.ts` on purpose**: in Next 16 `proxy.ts` runs only on the **Node**
runtime, and OpenNext/Cloudflare doesn't support Node middleware yet.
`middleware.ts` compiles as **Edge**, which OpenNext supports (and where Clerk
works). You'll see a deprecation warning in the build; it's **harmless**. Migrate
to `proxy.ts` once OpenNext supports Node middleware.

---

## Things to keep in mind

1. **Clerk keys** must be set in both **Build variables** and **runtime
   Variables/Secrets** in Cloudflare (see above), and in `.env.local` / `.dev.vars`
   for local work.
2. **Bucket name / jurisdiction** in `wrangler.jsonc` must match your real R2 bucket.
3. Images must live under the `Imagenes anteriores/` prefix (or change `BASE_PREFIX`).
4. Add staff in Clerk (Users → invite, or allowlist) and enable **Email
   verification code** — there's no public sign-up in the app.

The binding `IMAGENES_BUCKET` and the `Imagenes anteriores/` prefix are centralized
(`wrangler.jsonc` and `BASE_PREFIX`) so they're easy to rename.
