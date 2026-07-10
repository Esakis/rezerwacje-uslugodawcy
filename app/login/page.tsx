import Link from "next/link";
import { Suspense } from "react";
import { googleEnabled } from "@/lib/google";
import { AuthShell, GoogleButton, OrDivider } from "../auth-ui";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const google = googleEnabled();

  return (
    <AuthShell
      title="Zaloguj się"
      subtitle="Wróć do swojego kalendarza i klientów."
      errorCode={error}
      footer={
        <>
          Nie masz konta?{" "}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            Załóż darmowe
          </Link>
        </>
      }
    >
      {google && (
        <div className="mt-5">
          <GoogleButton label="Zaloguj przez Google" />
          <OrDivider />
        </div>
      )}

      <Suspense>
        <LoginForm />
      </Suspense>

      <p className="mt-4 text-xs text-ink-400">Konto demo: demo@bookeasy.pl / demo1234</p>
    </AuthShell>
  );
}
