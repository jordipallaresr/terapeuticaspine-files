"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Step = "email" | "code";

// Sólo se permite el acceso a correos de la organización. Se valida en cliente
// antes de llamar a Clerk; el mensaje de error es genérico a propósito.
const ALLOWED_EMAIL_DOMAIN = "terapeuticaspine.com";

export function SignInForm() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || submitting) return;
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
      setError("Email no válido.");
      return;
    }

    setSubmitting(true);
    try {
      const attempt = await signIn.create({ identifier: normalizedEmail });

      const emailFactor = attempt.supportedFirstFactors?.find(
        (f) => f.strategy === "email_code",
      ) as { emailAddressId: string } | undefined;

      if (!emailFactor) {
        setError(
          "Esta cuenta no permite acceso por código de email. Contacta con el administrador.",
        );
        return;
      }

      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: emailFactor.emailAddressId,
      });
      setStep("code");
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: code.trim(),
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
      } else {
        setError("No se pudo completar el acceso. Inténtalo de nuevo.");
      }
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex flex-col items-center text-center">
        <BrandLogo className="mb-3 size-11 rounded-xl" />
        <h1 className="text-xl font-semibold tracking-tight">
          Terapeutica Spine SL
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === "email"
            ? "Introduce tu email para acceder."
            : `Te hemos enviado un código a ${email}.`}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        {step === "email" ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-9"
                />
              </div>
            </div>

            {error && <ErrorText>{error}</ErrorText>}

            <Button
              type="submit"
              className="h-11 w-full"
              disabled={!isLoaded || submitting || !email.trim()}
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Enviar código
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium">
                Código de verificación
              </label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="h-12 text-center text-lg tracking-[0.5em]"
              />
            </div>

            {error && <ErrorText>{error}</ErrorText>}

            <Button
              type="submit"
              className="h-11 w-full"
              disabled={!isLoaded || submitting || code.length < 6}
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Acceder
            </Button>

            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Usar otro email
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Acceso restringido al personal de Terapeutica Spine SL.
      </p>
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {children}
    </p>
  );
}

function clerkErrorMessage(err: unknown): string {
  if (
    err &&
    typeof err === "object" &&
    "errors" in err &&
    Array.isArray((err as { errors: unknown[] }).errors)
  ) {
    const first = (err as { errors: { message?: string }[] }).errors[0];
    if (first?.message) return first.message;
  }
  return "Ha ocurrido un error. Inténtalo de nuevo.";
}
