"use server";

import { revalidatePath } from "next/cache";
import { requireProvider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/format";

export type ActionResult = { ok: boolean; error?: string };

export async function addClient(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const provider = await requireProvider();
  const name = String(formData.get("name") || "").trim();
  const phone = normalizePhone(String(formData.get("phone") || ""));
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!name) return { ok: false, error: "Podaj imię klienta." };
  if (!phone) return { ok: false, error: "Nieprawidłowy numer telefonu." };

  const existing = await prisma.client.findUnique({
    where: { providerId_phone: { providerId: provider.id, phone } },
  });
  if (existing) return { ok: false, error: "Klient z tym numerem już istnieje." };

  await prisma.client.create({
    data: { providerId: provider.id, name, phone, notes },
  });

  revalidatePath("/panel/clients");
  return { ok: true };
}

export async function updateNotes(id: string, notes: string): Promise<void> {
  const provider = await requireProvider();
  await prisma.client.updateMany({
    where: { id, providerId: provider.id },
    data: { notes: notes.trim() || null },
  });
  revalidatePath("/panel/clients");
}
