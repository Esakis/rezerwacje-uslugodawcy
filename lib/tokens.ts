// Token odwołania: prosty, nieodgadywalny identyfikator zapisany przy wizycie
// (Appointment.cancelToken). Link w SMS: /cancel/<token> — bez logowania klienta.
// Uwaga: samą wartość generuje Prisma (cuid). Tu tylko helper do budowy URL.

export function cancelUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/cancel/${token}`;
}

export function bookingUrl(slug: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/${slug}`;
}
