"use server";

import { revalidatePath } from "next/cache";
import { requireProvider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPlan } from "@/lib/plans";

export type ActionResult = { ok: boolean; error?: string };

export async function addStaff(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const provider = await requireProvider();
  const name = String(formData.get("name") || "").trim();
  const role = String(formData.get("role") || "").trim() || null;

  if (!name) return { ok: false, error: "Podaj imię osoby." };

  const plan = getPlan(provider.plan);
  const count = await prisma.staffMember.count({ where: { providerId: provider.id } });
  if (count >= plan.staffLimit) {
    return {
      ok: false,
      error: `Twój plan (${plan.name}) pozwala na ${plan.staffLimit} ${
        plan.staffLimit === 1 ? "osobę" : "osób"
      }. Zmień plan, aby dodać więcej.`,
    };
  }

  await prisma.staffMember.create({
    data: { providerId: provider.id, name, role, sortOrder: count + 1 },
  });

  revalidatePath("/panel/staff");
  return { ok: true };
}

export async function toggleStaff(id: string): Promise<void> {
  const provider = await requireProvider();
  const s = await prisma.staffMember.findFirst({ where: { id, providerId: provider.id } });
  if (!s) return;
  await prisma.staffMember.update({ where: { id }, data: { active: !s.active } });
  revalidatePath("/panel/staff");
}

export async function deleteStaff(id: string): Promise<void> {
  const provider = await requireProvider();
  // Wizyty tej osoby zostaną z staffId = null (onDelete: SetNull), nie znikają.
  await prisma.staffMember.deleteMany({ where: { id, providerId: provider.id } });
  revalidatePath("/panel/staff");
}
