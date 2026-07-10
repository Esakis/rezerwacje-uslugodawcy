"use server";

import { revalidatePath } from "next/cache";
import { requireProvider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parsePriceToGrosze } from "@/lib/format";

export type ActionResult = { ok: boolean; error?: string };

export async function addService(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const provider = await requireProvider();
  const name = String(formData.get("name") || "").trim();
  const durationMin = Number(formData.get("durationMin"));
  const price = parsePriceToGrosze(String(formData.get("price") || ""));

  if (!name) return { ok: false, error: "Podaj nazwę usługi." };
  if (!Number.isFinite(durationMin) || durationMin <= 0)
    return { ok: false, error: "Czas trwania musi być dodatni." };
  if (price === null) return { ok: false, error: "Nieprawidłowa cena." };

  const count = await prisma.service.count({ where: { providerId: provider.id } });
  await prisma.service.create({
    data: {
      providerId: provider.id,
      name,
      durationMin: Math.round(durationMin),
      priceGrosze: price,
      sortOrder: count + 1,
    },
  });

  revalidatePath("/panel/services");
  return { ok: true };
}

export async function toggleService(id: string): Promise<void> {
  const provider = await requireProvider();
  const s = await prisma.service.findFirst({ where: { id, providerId: provider.id } });
  if (!s) return;
  await prisma.service.update({ where: { id }, data: { active: !s.active } });
  revalidatePath("/panel/services");
}

export async function deleteService(id: string): Promise<void> {
  const provider = await requireProvider();
  await prisma.service.deleteMany({ where: { id, providerId: provider.id } });
  revalidatePath("/panel/services");
}
