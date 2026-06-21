import { SignedIn } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";

import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";

export async function Header() {
  // Request without middleware context (e.g. /favicon.ico → 404 inside the
  // layout): currentUser() would throw; we wrap it to avoid cluttering the logs.
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
    // Only shown when signed in: there's no header on the login page
    // (the sign-in card itself already carries the logo and the name).
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
