"use server";

import { revalidatePath } from "next/cache";
import { requireProvider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  isValidHHMM,
  serializeWorkingHours,
  hhmmToMinutes,
  type WorkingHours,
} from "@/lib/workingHours";

export type ActionResult = { ok: boolean; error?: string; message?: string };

// Formularz przesyła dla każdego dnia (0-6): enabled, from, to.
export async function saveWorkingHours(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const provider = await requireProvider();
  const wh: WorkingHours = {};

  for (let d = 0; d <= 6; d++) {
    const enabled = formData.get(`enabled_${d}`) === "on";
    if (!enabled) {
      wh[String(d)] = [];
      continue;
    }
    const from = String(formData.get(`from_${d}`) || "");
    const to = String(formData.get(`to_${d}`) || "");
    if (!isValidHHMM(from) || !isValidHHMM(to)) {
      return { ok: false, error: `Nieprawidłowe godziny dla jednego z dni.` };
    }
    if (hhmmToMinutes(to) <= hhmmToMinutes(from)) {
      return { ok: false, error: `Godzina zakończenia musi być późniejsza niż początek.` };
    }
    wh[String(d)] = [{ from, to }];
  }

  const bufferMin = Math.max(0, Number(formData.get("bufferMin")) || 0);
  const slotStepMin = Math.max(5, Number(formData.get("slotStepMin")) || 15);

  await prisma.provider.update({
    where: { id: provider.id },
    data: { workingHours: serializeWorkingHours(wh), bufferMin, slotStepMin },
  });

  revalidatePath("/panel/hours");
  return { ok: true, message: "Zapisano godziny pracy." };
}
