"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  IconMenu,
  IconX,
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

function isActive(pathname: string, href: string): boolean {
  return href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);
}

export function PanelNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto hidden max-w-6xl px-2 sm:block sm:px-4">
      <ul className="scroll-x flex gap-1 overflow-x-auto">
        {LINKS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
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

// Hamburger dla telefonów — przycisk w nagłówku + rozwijana lista pod nim.
export function PanelMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Zamknij menu po przejściu na inną stronę.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Zamknij menu" : "Otwórz menu"}
        aria-expanded={open}
        className="relative z-30 flex h-10 w-10 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100"
      >
        {open ? <IconX width={22} height={22} /> : <IconMenu width={22} height={22} />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10 bg-ink-900/20" onClick={() => setOpen(false)} />
          <nav className="absolute inset-x-0 top-full z-20 border-b border-ink-100 bg-white shadow-lg">
            <ul className="py-1">
              {LINKS.map(({ href, label, Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${
                        active ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-50"
                      }`}
                    >
                      <Icon width={18} height={18} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
