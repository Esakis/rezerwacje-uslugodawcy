import { requireProvider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fmtDateHuman } from "@/lib/time";
import { AddClient } from "./add-client";

export default async function ClientsPage() {
  const provider = await requireProvider();

  const clients = await prisma.client.findMany({
    where: { providerId: provider.id },
    orderBy: { createdAt: "desc" },
    include: {
      appointments: {
        orderBy: { startAt: "desc" },
        include: { service: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Klienci</h1>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Dodaj klienta</h2>
        <AddClient />
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Baza klientów ({clients.length})</h2>
        {clients.length === 0 ? (
          <p className="text-sm text-slate-500">Brak klientów. Pojawią się tu automatycznie po pierwszej rezerwacji.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {clients.map((c) => {
              const done = c.appointments.filter((a) => a.status === "done").length;
              const noShow = c.appointments.filter((a) => a.status === "no_show").length;
              const last = c.appointments[0];
              return (
                <li key={c.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-medium">{c.name}</span>{" "}
                      <span className="text-sm text-slate-500">· {c.phone}</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="badge bg-slate-100 text-slate-600">{c.appointments.length} wizyt</span>
                      {done > 0 && <span className="badge bg-emerald-50 text-emerald-700">{done} zrealizowanych</span>}
                      {noShow > 0 && <span className="badge bg-amber-50 text-amber-700">{noShow} no-show</span>}
                    </div>
                  </div>
                  {c.notes && <p className="mt-1 text-sm text-slate-500">📝 {c.notes}</p>}
                  {last && (
                    <p className="mt-1 text-xs text-slate-400">
                      Ostatnia wizyta: {fmtDateHuman(last.startAt)}
                      {last.service ? ` · ${last.service.name}` : ""}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
