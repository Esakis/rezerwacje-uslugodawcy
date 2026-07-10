"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export type CancelResult = { ok: boolean; error?: string };

// Odwołanie wizyty przez klienta na podstawie podpisanego tokenu (bez logowania).
export async function cancelByToken(token: string): Promise<CancelResult> {
  const appt = await prisma.appointment.findUnique({ where: { cancelToken: token } });
  if (!appt) return { ok: false, error: "Nie znaleziono rezerwacji." };
  if (appt.status !== "booked") return { ok: false, error: "Ta wizyta nie jest już aktywna." };
  if (appt.startAt.getTime() <= Date.now()) {
    return { ok: false, error: "Nie można odwołać wizyty, która już się odbyła lub trwa." };
  }

  await prisma.appointment.update({
    where: { id: appt.id },
    data: { status: "cancelled" },
  });

  revalidatePath(`/cancel/${token}`);
  revalidatePath("/panel");
  revalidatePath("/panel/calendar");
  return { ok: true };
}
