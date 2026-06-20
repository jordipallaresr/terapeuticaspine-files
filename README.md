# Terapeutica Spine SL — Archivo de imágenes

Web app interna y privada para **listar, buscar y descargar** carpetas de imágenes
almacenadas en **Cloudflare R2**. Toda la app va detrás de **Clerk**: sin sesión no
se ve ni se descarga nada.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- Desplegada en **Cloudflare Workers** con **`@opennextjs/cloudflare`** (OpenNext)
- **Clerk** (`@clerk/nextjs`) para autenticación
- **shadcn/ui** + **Tailwind CSS v4** + **lucide-react** para la UI
- **R2 vía binding nativo** del Worker (sin SDK de S3)
- **`client-zip`** para generar el ZIP en streaming (memoria constante)

## Cómo funciona

- La home (`/`) lista todas las carpetas de primer nivel bajo el prefijo
  `Imagenes/` en el bucket R2, paginando con `cursor` hasta el final (~2500
  carpetas). Los nombres se muestran limpios (sin prefijo ni barra final).
- La búsqueda filtra por substring, **case-insensitive y en el cliente** (instantánea).
  Se cargan todos los nombres una vez en el servidor y se filtran en el navegador.
- Al hacer clic en una carpeta se descarga un **ZIP con todos sus archivos** vía
  `GET /api/download?prefix=<carpeta-url-encoded>`. El endpoint verifica la sesión
  de Clerk (401 si no hay), lista los objetos paginando y genera el zip en
  streaming con rutas relativas dentro del zip.

---

## 1) Requisitos

- Node 20+ y **pnpm**
- Cuenta de Cloudflare con **R2 habilitado** (Workers en plan de pago si quieres el
  límite `cpu_ms = 300000`)
- Cuenta de **Clerk** con una aplicación creada

## 2) Instalar

```bash
pnpm install
```

## 3) Variables y secrets

Hay **dos** archivos de variables locales (uno por cada modo de ejecución):

| Archivo        | Lo usa                | Para qué                          |
| -------------- | --------------------- | --------------------------------- |
| `.env.local`   | `pnpm dev` (Next dev) | build + runtime en desarrollo     |
| `.dev.vars`    | `pnpm preview` (workerd) | runtime en el simulador de CF  |

Crea ambos a partir de las plantillas y rellena las claves de Clerk:

```bash
cp .env.example .env.local
cp .dev.vars.example .dev.vars
```

Variables:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — clave pública de Clerk (`pk_...`)
- `CLERK_SECRET_KEY` — clave secreta de Clerk (`sk_...`)
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `BASE_PREFIX=Imagenes/` — prefijo base dentro del bucket (cámbialo si reorganizas)

> El **nombre del binding** (`IMAGENES_BUCKET`) y el **nombre real del bucket**
> (`onedrive-backup`) se configuran en `wrangler.jsonc`, no en estos archivos.

### ⚠️ Importante para el deploy en Cloudflare (build **y** runtime)

En Cloudflare/OpenNext las variables de Clerk se necesitan en **DOS sitios**, o el
deploy falla:

1. **Build** → en *Workers Builds* del dashboard: **Settings → Build → Build
   variables and secrets**. Añade ahí `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
   `CLERK_SECRET_KEY` y `NEXT_PUBLIC_CLERK_SIGN_IN_URL`.
   (La `NEXT_PUBLIC_*` se "hornea" en el bundle en build → es imprescindible aquí.)
2. **Runtime** → como **secrets** del Worker. Por CLI:

   ```bash
   pnpm wrangler secret put CLERK_SECRET_KEY
   pnpm wrangler secret put NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   ```

   O en **Settings → Variables and Secrets** del Worker.

Ponerlas sólo en uno de los dos lados hace que el build o el runtime fallen.

## 4) Configurar el bucket R2 (dashboard de Cloudflare)

1. **R2 → Create bucket** (si no existe). Apunta el nombre real.
2. Sube las imágenes con la estructura `Imagenes/<carpeta>/<archivos...>`.
3. Liga el bucket al binding del Worker. Ya está declarado en `wrangler.jsonc`:

   ```jsonc
   "r2_buckets": [
     { "binding": "IMAGENES_BUCKET", "bucket_name": "onedrive-backup" }
   ]
   ```

   - `binding` = cómo lo ve el código (`env.IMAGENES_BUCKET`). **No lo cambies**
     salvo que también lo cambies en el código.
   - `bucket_name` = **nombre real** del bucket en tu cuenta. Si tu bucket no se
     llama `onedrive-backup`, **cámbialo aquí**.
   - El bucket **no** se expone públicamente: todo acceso pasa por la app autenticada.

4. (Opcional) Regenera los tipos del binding tras tocar `wrangler.jsonc`:

   ```bash
   pnpm cf-typegen
   ```

## 5) Configurar Clerk (dashboard de Clerk)

El sign-in es un **formulario propio** (email → código OTP), no la caja de Clerk.
Para que funcione hay que activar el acceso por código de email en el dashboard:

1. Crea una aplicación en Clerk y copia las claves (**API Keys**) a `.env.local`
   y `.dev.vars`.
2. **User & Authentication → Email, Phone, Username**:
   - **Email address**: activado.
   - En su verificación, activa **"Email verification code"** (el OTP).
   - **Password**: desactivado. **Username** y **Phone**: desactivados.
3. **SSO Connections / Social providers**: desactiva Google y los demás (el
   formulario propio sólo usa email + OTP).
4. **No hay registro público.** Da de alta a tu equipo desde el dashboard de Clerk
   (**Users → invitar**) o usa **Restrictions → Allowlist**. La app no expone
   `/sign-up`.
5. La ruta de acceso es `/sign-in` (`NEXT_PUBLIC_CLERK_SIGN_IN_URL`).

## 6) Ejecutar

```bash
pnpm dev       # desarrollo (Next dev) en http://localhost:3000
pnpm preview   # build OpenNext + simulador de Cloudflare (workerd) en local
pnpm deploy    # build OpenNext + deploy al Worker
```

> **Nota sobre R2 en local:** `pnpm dev` y `pnpm preview` usan un R2 **local
> simulado** (vacío) por defecto. Para ver tus ~2500 carpetas reales, despliega
> (`pnpm deploy`) o usa bindings remotos. Lo más sencillo es probar el listado y la
> descarga reales directamente en el Worker desplegado.

---

## Nota sobre Next.js 16 (middleware vs proxy)

Next 16 deprecó la convención `middleware.ts` a favor de `proxy.ts`. Aquí se usa
**`middleware.ts` a propósito**: en Next 16 `proxy.ts` corre sólo en runtime
**Node**, y OpenNext/Cloudflare aún no soporta middleware en Node. `middleware.ts`
compila como **Edge**, que es lo que OpenNext sí soporta (y donde Clerk funciona).
Verás un aviso de deprecación en el build; es **inofensivo**. Cuando OpenNext
soporte Node middleware se podrá migrar a `proxy.ts`.

## Qué tienes que rellenar tú antes de desplegar

1. **Claves de Clerk** en `.env.local` y `.dev.vars` (local), y en **Workers
   Builds** (build) + **secrets del Worker** (runtime):
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
2. **Nombre real del bucket R2** en `wrangler.jsonc` → `bucket_name`
   (ahora mismo `onedrive-backup`). Si tu bucket se llama distinto, cámbialo.
3. Comprueba que las imágenes están bajo el prefijo `Imagenes/` (o ajusta
   `BASE_PREFIX`).
4. Da de alta a tu equipo en Clerk (Users → invitar, o allowlist) y activa el
   acceso por **Email verification code** (no hay registro público en la app).

El binding `IMAGENES_BUCKET` y el prefijo `Imagenes/` están centralizados
(`wrangler.jsonc` y `BASE_PREFIX`) para que sea fácil renombrarlos.
