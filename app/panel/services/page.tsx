import { requireProvider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AddService } from "./add-service";
import { ServiceRow } from "./service-row";

export default async function ServicesPage() {
  const provider = await requireProvider();
  const services = await prisma.service.findMany({
    where: { providerId: provider.id },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Usługi</h1>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Twoje usługi</h2>
        {services.length === 0 ? (
          <p className="text-sm text-slate-500">Brak usług. Dodaj pierwszą poniżej.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {services.map((s) => (
              <ServiceRow
                key={s.id}
                id={s.id}
                name={s.name}
                durationMin={s.durationMin}
                priceGrosze={s.priceGrosze}
                active={s.active}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Dodaj usługę</h2>
        <AddService />
      </div>
    </div>
  );
}
