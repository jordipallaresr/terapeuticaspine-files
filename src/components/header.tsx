import { SignedIn } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";

import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";

export async function Header() {
  // Petición sin contexto de middleware (p.ej. /favicon.ico → 404 dentro del
  // layout): currentUser() lanzaría; lo envolvemos para no ensuciar los logs.
  let email: string | undefined;
  try {
    const user = await currentUser();
    email =
      user?.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress ?? user?.emailAddresses[0]?.emailAddress;
  } catch {
    email = undefined;
  }

  return (
    // Sólo se muestra con sesión iniciada: en la página de login no hay header
    // (la propia tarjeta de acceso ya lleva el logo y el nombre).
    <SignedIn>
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo className="size-9 shrink-0 rounded-lg" />
            <p className="truncate text-sm font-semibold leading-tight sm:text-base">
              Terapeutica Spine SL
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            {email && (
              <span className="hidden max-w-[40vw] truncate text-sm text-muted-foreground sm:inline">
                {email}
              </span>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>
    </SignedIn>
  );
}
