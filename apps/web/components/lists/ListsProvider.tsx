"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Retail cart and commercial quote list. Kept apart on purpose (spec §5):
 * they never mix. Both live in this browser's storage until checkout/submit,
 * where the server re-prices everything from the catalog.
 */
export interface CartLine {
  sku: string;
  slug: string;
  name: string;
  variant: string;
  priceCents: number;
  qty: number;
}
export interface QuoteLine {
  slug: string;
  name: string;
  model: string;
  qty: number;
  unit: string;
  note: string;
}

interface Lists {
  ready: boolean;
  cart: CartLine[];
  quote: QuoteLine[];
  addToCart: (line: CartLine) => void;
  setCartQty: (sku: string, qty: number) => void;
  removeFromCart: (sku: string) => void;
  clearCart: () => void;
  addToQuote: (line: QuoteLine) => void;
  updateQuote: (slug: string, patch: Partial<Pick<QuoteLine, "qty" | "note">>) => void;
  removeFromQuote: (slug: string) => void;
  clearQuote: () => void;
}

const Ctx = createContext<Lists | null>(null);
const CART_KEY = "ff_cart_v1";
const QUOTE_KEY = "ff_quote_v1";
const MAX_QTY = 9999;

function read<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}
function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: lists still work for this visit */
  }
}
const clampQty = (n: number) => Math.max(1, Math.min(MAX_QTY, Math.floor(Number.isFinite(n) ? n : 1)));

export function ListsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [quote, setQuote] = useState<QuoteLine[]>([]);

  useEffect(() => {
    setCart(read<CartLine>(CART_KEY));
    setQuote(read<QuoteLine>(QUOTE_KEY));
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) setCart(read<CartLine>(CART_KEY));
      if (e.key === QUOTE_KEY) setQuote(read<QuoteLine>(QUOTE_KEY));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (ready) write(CART_KEY, cart);
  }, [cart, ready]);
  useEffect(() => {
    if (ready) write(QUOTE_KEY, quote);
  }, [quote, ready]);

  const addToCart = useCallback((line: CartLine) => {
    setCart((c) => {
      const hit = c.find((l) => l.sku === line.sku);
      if (hit) return c.map((l) => (l.sku === line.sku ? { ...l, qty: clampQty(l.qty + line.qty) } : l));
      return [...c, { ...line, qty: clampQty(line.qty) }];
    });
  }, []);
  const setCartQty = useCallback((sku: string, qty: number) => setCart((c) => c.map((l) => (l.sku === sku ? { ...l, qty: clampQty(qty) } : l))), []);
  const removeFromCart = useCallback((sku: string) => setCart((c) => c.filter((l) => l.sku !== sku)), []);
  const clearCart = useCallback(() => setCart([]), []);

  const addToQuote = useCallback((line: QuoteLine) => {
    setQuote((q) => {
      const hit = q.find((l) => l.slug === line.slug);
      if (hit) return q.map((l) => (l.slug === line.slug ? { ...l, qty: clampQty(l.qty + line.qty) } : l));
      return [...q, { ...line, qty: clampQty(line.qty) }];
    });
  }, []);
  const updateQuote = useCallback(
    (slug: string, patch: Partial<Pick<QuoteLine, "qty" | "note">>) =>
      setQuote((q) =>
        q.map((l) =>
          l.slug === slug
            ? { ...l, ...(patch.qty !== undefined ? { qty: clampQty(patch.qty) } : {}), ...(patch.note !== undefined ? { note: patch.note.slice(0, 500) } : {}) }
            : l,
        ),
      ),
    [],
  );
  const removeFromQuote = useCallback((slug: string) => setQuote((q) => q.filter((l) => l.slug !== slug)), []);
  const clearQuote = useCallback(() => setQuote([]), []);

  const value = useMemo(
    () => ({ ready, cart, quote, addToCart, setCartQty, removeFromCart, clearCart, addToQuote, updateQuote, removeFromQuote, clearQuote }),
    [ready, cart, quote, addToCart, setCartQty, removeFromCart, clearCart, addToQuote, updateQuote, removeFromQuote, clearQuote],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLists() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLists must be used inside ListsProvider");
  return v;
}
