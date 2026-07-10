import { requireProvider } from "@/lib/auth";
import { parseWorkingHours } from "@/lib/workingHours";
import { HoursForm } from "./hours-form";

export default async function HoursPage() {
  const provider = await requireProvider();
  const wh = parseWorkingHours(provider.workingHours);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Godziny pracy</h1>
      <p className="text-sm text-slate-500">
        Na podstawie tych godzin klienci widzą wolne terminy na Twojej stronie rezerwacji.
      </p>
      <div className="card">
        <HoursForm workingHours={wh} bufferMin={provider.bufferMin} slotStepMin={provider.slotStepMin} />
      </div>
    </div>
  );
}
