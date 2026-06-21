import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/sign-in-form";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  // Already signed in? Skip the login screen and go straight to the app.
  const { userId } = await auth();
  if (userId) redirect("/");

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <SignInForm />
    </div>
  );
}
