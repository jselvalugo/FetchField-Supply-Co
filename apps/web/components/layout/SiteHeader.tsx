"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, TrailMarker, cx, type BlazeShape } from "@fetchfield/ui";
import { useLists } from "../lists/ListsProvider";
import { StoreSwitch, storeFromPath } from "./StoreSwitch";

interface NavCat {
  slug: string;
  name: string;
  blaze: BlazeShape;
}

export function SiteHeader({ pro, shop }: { pro: NavCat[]; shop: NavCat[] }) {
  const path = usePathname();
  const store = storeFromPath(path);
  const { ready, cart, quote } = useLists();
  const cartCount = cart.reduce((n, l) => n + l.qty, 0);
  const quoteCount = quote.length;

  const cats = store === "pro" ? pro : store === "shop" ? shop : null;
  const base = store === "pro" ? "/pro" : "/shop";

  return (
    <header className={cx("site-header", store === "pro" && "site-header--pro")}>
      <div className="wrap site-header__bar">
        <Link href="/" className="site-header__logo" aria-label="FetchField Supply Co. home">
          <Logo className="hidden sm:inline-flex" />
          <Logo compact className="sm:hidden logo-compact" />
        </Link>
        <StoreSwitch className="site-header__switch" />
        <div className="site-header__tools">
          {store !== "shop" && (
            <Link href="/pro/quote" className="tool-link" aria-label={`Quote list, ${ready ? quoteCount : 0} items`}>
              <span className="tool-link__label">Quote list</span>
              <span className={cx("tool-link__count", ready && quoteCount > 0 && "is-on")}>{ready ? quoteCount : 0}</span>
            </Link>
          )}
          {store !== "pro" && (
            <Link href="/shop/cart" className="tool-link" aria-label={`Cart, ${ready ? cartCount : 0} items`}>
              <span className="tool-link__label">Cart</span>
              <span className={cx("tool-link__count", ready && cartCount > 0 && "is-on")}>{ready ? cartCount : 0}</span>
            </Link>
          )}
        </div>
      </div>
      <nav aria-label={store === "pro" ? "Pro categories" : store === "shop" ? "Shop categories" : "Main"} className="site-nav">
        <div className="wrap site-nav__inner">
          {cats ? (
            <ul className="site-nav__list">
              {cats.map((c) => {
                const href = `${base}/${c.slug}`;
                const on = path === href;
                return (
                  <li key={c.slug}>
                    <Link href={href} className={cx("site-nav__link", on && "is-active")} aria-current={on ? "page" : undefined}>
                      <TrailMarker shape={c.blaze} size={11} tone={store === "pro" ? "chalk" : "brand"} />
                      {c.name}
                    </Link>
                  </li>
                );
              })}
              {store === "pro" && (
                <li className="site-nav__aside">
                  <Link href="/pro/procurement" className={cx("site-nav__link", path === "/pro/procurement" && "is-active")}>
                    Procurement &amp; W-9
                  </Link>
                </li>
              )}
              {store === "shop" && (
                <li className="site-nav__aside">
                  <Link href="/shop/track" className={cx("site-nav__link", path === "/shop/track" && "is-active")}>
                    Track an order
                  </Link>
                </li>
              )}
            </ul>
          ) : (
            <ul className="site-nav__list">
              <li><Link className="site-nav__link" href="/pro">Park &amp; property equipment</Link></li>
              <li><Link className="site-nav__link" href="/shop">Gear for your dog</Link></li>
              <li><Link className={cx("site-nav__link", path.startsWith("/field-notes") && "is-active")} href="/field-notes">Field notes</Link></li>
              <li className="site-nav__aside"><Link className="site-nav__link" href="/pro/procurement">Procurement &amp; W-9</Link></li>
            </ul>
          )}
        </div>
      </nav>
    </header>
  );
}
