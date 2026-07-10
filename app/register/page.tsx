import Link from "next/link";
import { googleEnabled } from "@/lib/google";
import { AuthShell, GoogleButton, OrDivider } from "../auth-ui";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  const google = googleEnabled();

  return (
    <AuthShell
      title="Załóż konto"
      subtitle="14 dni za darmo, bez karty."
      footer={
        <>
          Masz już konto?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Zaloguj się
          </Link>
        </>
      }
    >
      {google && (
        <div className="mt-5">
          <GoogleButton label="Kontynuuj z Google" />
          <OrDivider />
        </div>
      )}

      <RegisterForm />
    </AuthShell>
  );
}
