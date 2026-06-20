// NOTA (Next.js 16): mantenemos la convención `middleware.ts` (runtime Edge) a
// propósito, pese al aviso de deprecación que sugiere `proxy.ts`. En Next 16
// `proxy.ts` se ejecuta SÓLO en runtime Node, y OpenNext/Cloudflare todavía no
// soporta middleware en Node ("Node.js middleware is not currently supported").
// `middleware.ts` compila como Edge, que es lo que OpenNext sí soporta y donde
// Clerk funciona. Migrar a `proxy.ts` cuando OpenNext soporte Node middleware.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Rutas públicas: el sign-in (no hay registro) y robots.txt (para que los
// crawlers puedan leer el Disallow). Todo lo demás (incluido /api/download)
// queda protegido.
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/robots.txt"]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Todas las rutas excepto internas de Next y archivos estáticos,
    // salvo que aparezcan en query params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Siempre ejecutar para rutas de API.
    "/(api|trpc)(.*)",
  ],
};
