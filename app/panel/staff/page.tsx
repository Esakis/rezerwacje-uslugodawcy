import { requireProvider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPlan, UNLIMITED } from "@/lib/plans";
import { AddStaff } from "./add-staff";
import { StaffRow } from "./staff-row";

export default async function StaffPage() {
  const provider = await requireProvider();
  const plan = getPlan(provider.plan);
  const staff = await prisma.staffMember.findMany({
    where: { providerId: provider.id },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Zespół</h1>
        <p className="mt-1 text-sm text-ink-500">
          Osoby, do których klienci umawiają wizyty. Gdy dodasz choć jedną, na stronie rezerwacji
          pojawi się krok „Do kogo się umawiasz?". Bez pracowników działa tryb solo (jeden kalendarz).
        </p>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Twój zespół</h2>
          <span className="badge bg-brand-50 text-brand-700">
            {plan.staffLimit === UNLIMITED
              ? `${staff.length} osób · bez limitu (plan ${plan.name})`
              : `${staff.length} / ${plan.staffLimit} w planie ${plan.name}`}
          </span>
        </div>
        {staff.length === 0 ? (
          <p className="text-sm text-ink-500">
            Brak osób. Dodaj pierwszą poniżej — albo zostaw puste, jeśli pracujesz sam/sama.
          </p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {staff.map((s) => (
              <StaffRow key={s.id} id={s.id} name={s.name} role={s.role} active={s.active} />
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Dodaj osobę</h2>
        <AddStaff />
      </div>
    </div>
  );
}
