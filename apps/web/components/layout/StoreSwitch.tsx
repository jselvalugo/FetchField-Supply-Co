"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cx } from "@fetchfield/ui";

export type Store = "pro" | "shop";
const COOKIE = "ff_store";

export function storeFromPath(path: string): Store | null {
  if (path === "/pro" || path.startsWith("/pro/")) return "pro";
  if (path === "/shop" || path.startsWith("/shop/")) return "shop";
  return null;
}

/** Remembers the last store in a first-party cookie (no personal data, 1 year). */
function remember(store: Store) {
  document.cookie = `${COOKIE}=${store}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}
function recalled(): Store | null {
  const m = /(?:^|; )ff_store=(pro|shop)/.exec(document.cookie);
  return (m?.[1] as Store | undefined) ?? null;
}

/** The persistent Pro / Shop switch, styled as a two-panel trail sign. */
export function StoreSwitch({ className }: { className?: string }) {
  const path = usePathname();
  const fromPath = storeFromPath(path);
  const [last, setLast] = useState<Store | null>(null);

  useEffect(() => {
    if (fromPath) remember(fromPath);
    setLast(fromPath ?? recalled());
  }, [fromPath]);

  const active = fromPath ?? last;
  return (
    <nav aria-label="Store" className={cx("store-switch", className)}>
      <Link href="/pro" className={cx("store-switch__opt", active === "pro" && "is-active")} aria-current={fromPath === "pro" ? "true" : undefined}>
        <span className="store-switch__k">For parks</span>
        <span className="store-switch__v">Pro</span>
      </Link>
      <Link href="/shop" className={cx("store-switch__opt", active === "shop" && "is-active")} aria-current={fromPath === "shop" ? "true" : undefined}>
        <span className="store-switch__k">For your dog</span>
        <span className="store-switch__v">Shop</span>
      </Link>
    </nav>
  );
}
