// NOTE (Next.js 16): we keep the `middleware.ts` convention (Edge runtime) on
// purpose, despite the deprecation warning that suggests `proxy.ts`. In Next 16
// `proxy.ts` runs ONLY in the Node runtime, and OpenNext/Cloudflare does not yet
// support middleware on Node ("Node.js middleware is not currently supported").
// `middleware.ts` compiles as Edge, which is what OpenNext does support and where
// Clerk works. Migrate to `proxy.ts` when OpenNext supports Node middleware.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes: sign-in (there is no sign-up) and robots.txt (so crawlers can
// read the Disallow). Everything else (including /api/download) is protected.
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/robots.txt"]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    // Redirect to OUR /sign-in page (not Clerk's Account Portal) when there is
    // no session, explicitly so we don't depend on environment variables.
    await auth.protect({
      unauthenticatedUrl: new URL("/sign-in", request.url).toString(),
    });
  }
});

export const config = {
  matcher: [
    // All routes except Next internals and static files,
    // unless they appear in query params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
