"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { defaultWorkingHours, serializeWorkingHours } from "@/lib/workingHours";

const schema = z.object({
  name: z.string().min(2, "Podaj nazwę salonu."),
  email: z.string().email("Nieprawidłowy e-mail."),
  password: z.string().min(6, "Hasło min. 6 znaków."),
});

export type ActionState = { error?: string };

export async function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.provider.findUnique({ where: { email } });
  if (existing) {
    return { error: "Konto z tym e-mailem już istnieje." };
  }

  // Unikalny slug.
  const base = slugify(name) || "salon";
  let slug = base;
  let n = 1;
  while (await prisma.provider.findUnique({ where: { slug } })) {
    slug = `${base}-${++n}`;
  }

  const provider = await prisma.provider.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      name,
      slug,
      workingHours: serializeWorkingHours(defaultWorkingHours()),
      plan: "trial",
      trialUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  await createSession(provider.id);
  redirect("/panel");
}
