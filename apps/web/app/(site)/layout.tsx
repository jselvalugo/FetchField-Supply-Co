import Link from "next/link";
import { ListsProvider } from "@/components/lists/ListsProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getProCategories, getShopCategories } from "@/lib/catalog";
import { site } from "@/lib/site";

/** Catalog pages re-render at most every 5 minutes; admin saves revalidate immediately. */
export const revalidate = 300;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [pro, shop] = await Promise.all([getProCategories(), getShopCategories()]);
  const nav = (cats: typeof pro) => cats.map(({ slug, name, blaze }) => ({ slug, name, blaze }));
  return (
    <>
      {site.sampleCatalog && (
        <p className="sample-bar m-0">
          <span className="wrap block">
            Preview: products, specs and prices are sample data until supplier confirmation.{" "}
            <Link href="/about#status" className="link">What that means</Link>
            {site.comingSoon && <> · <a href="/preview/lock" className="link">Leave preview</a></>}
          </span>
        </p>
      )}
      <ListsProvider>
        <SiteHeader pro={nav(pro)} shop={nav(shop)} />
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
      </ListsProvider>
      <SiteFooter />
    </>
  );
}
