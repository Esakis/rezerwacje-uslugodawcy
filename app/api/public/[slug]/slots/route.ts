import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeSlots } from "@/lib/slots";
import { fmtTime, warsawTimeToUtc } from "@/lib/time";

// GET /api/public/<slug>/slots?serviceId=..&date=YYYY-MM-DD
// Zwraca wolne terminy dla usługi w danym dniu (liczone w locie).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const searchParams = req.nextUrl.searchParams;
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date"); // YYYY-MM-DD
  const staffId = searchParams.get("staffId"); // opcjonalne: konkretna osoba

  if (!serviceId || !date) {
    return NextResponse.json({ error: "Brak serviceId lub date" }, { status: 400 });
  }

  const provider = await prisma.provider.findUnique({ where: { slug } });
  if (!provider) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, providerId: provider.id, active: true },
  });
  if (!service) {
    return NextResponse.json({ error: "Nieprawidłowa usługa" }, { status: 400 });
  }

  // Jeśli podano staffId — zweryfikuj, że należy do usługodawcy i jest aktywny.
  let validStaffId: string | null = null;
  if (staffId) {
    const staff = await prisma.staffMember.findFirst({
      where: { id: staffId, providerId: provider.id, active: true },
      select: { id: true },
    });
    if (!staff) {
      return NextResponse.json({ error: "Nieprawidłowy pracownik" }, { status: 400 });
    }
    validStaffId = staff.id;
  }

  // Kotwica dnia (południe UTC danej daty) — computeSlots i tak liczy dzień w TZ.
  const dayAnchor = warsawTimeToUtc(new Date(`${date}T12:00:00Z`), "12:00");
  const slots = await computeSlots(provider.id, dayAnchor, service.durationMin, validStaffId);

  return NextResponse.json({
    slots: slots.map((s) => ({ start: s.startAt.toISOString(), label: fmtTime(s.startAt) })),
  });
}
