"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({ items }: { items: Array<{ href: string; label: string; count?: number }> }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="adm-nav">
      {items.map((i) => {
        const on = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}>
            <span>{i.label}</span>
            {i.count !== undefined && i.count > 0 && <span className="adm-nav__count" aria-label={`${i.count} need attention`}>{i.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
