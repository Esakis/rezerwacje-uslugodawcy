"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";

export type ActionState = { error?: string };

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/panel");

  if (!email || !password) {
    return { error: "Podaj e-mail i hasło." };
  }

  const provider = await prisma.provider.findUnique({ where: { email } });
  if (!provider) {
    return { error: "Nieprawidłowy e-mail lub hasło." };
  }
  if (!provider.passwordHash) {
    return { error: "To konto zakładano przez Google. Użyj przycisku „Zaloguj przez Google”." };
  }
  if (!(await verifyPassword(password, provider.passwordHash))) {
    return { error: "Nieprawidłowy e-mail lub hasło." };
  }

  await createSession(provider.id);
  redirect(next.startsWith("/") ? next : "/panel");
}
