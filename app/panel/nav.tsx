"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconGrid,
  IconCalendar,
  IconScissors,
  IconClock,
  IconUsers,
  IconUser,
  IconChart,
  IconSettings,
} from "@/app/icons";

const LINKS = [
  { href: "/panel", label: "Pulpit", Icon: IconGrid },
  { href: "/panel/calendar", label: "Kalendarz", Icon: IconCalendar },
  { href: "/panel/staff", label: "Zespół", Icon: IconUsers },
  { href: "/panel/services", label: "Usługi", Icon: IconScissors },
  { href: "/panel/hours", label: "Godziny", Icon: IconClock },
  { href: "/panel/clients", label: "Klienci", Icon: IconUser },
  { href: "/panel/stats", label: "Statystyki", Icon: IconChart },
  { href: "/panel/settings", label: "Plan", Icon: IconSettings },
];

export function PanelNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto max-w-6xl px-2 sm:px-4">
      <ul className="scroll-x flex gap-1 overflow-x-auto">
        {LINKS.map(({ href, label, Icon }) => {
          const active = href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-ink-500 hover:bg-ink-100 hover:text-ink-800"
                }`}
              >
                <Icon width={17} height={17} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
