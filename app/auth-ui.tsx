import Link from "next/link";
import { IconGoogle } from "./icons";

// Wspólny „shell" dla stron logowania/rejestracji + przycisk Google.

const ERROR_LABELS: Record<string, string> = {
  google_off: "Logowanie Google nie jest skonfigurowane.",
  google_state: "Sesja logowania wygasła. Spróbuj ponownie.",
  google_failed: "Nie udało się zalogować przez Google. Spróbuj ponownie.",
};

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  errorCode,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  errorCode?: string;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-hero-glow px-4 py-8 sm:px-6 sm:py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient text-base font-bold text-white">
            B
          </span>
          <span className="text-xl font-bold tracking-tight">BookEasy</span>
        </Link>
        <div className="card">
          <h1 className="text-xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
          {errorCode && ERROR_LABELS[errorCode] && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {ERROR_LABELS[errorCode]}
            </p>
          )}
          {children}
        </div>
        <div className="mt-4 text-center text-sm text-ink-500">{footer}</div>
      </div>
    </main>
  );
}

export function GoogleButton({ label }: { label: string }) {
  return (
    <a href="/api/auth/google/start" className="btn-secondary w-full">
      <IconGoogle />
      {label}
    </a>
  );
}

export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-ink-200" />
      <span className="text-xs font-medium uppercase tracking-wide text-ink-400">lub</span>
      <span className="h-px flex-1 bg-ink-200" />
    </div>
  );
}
