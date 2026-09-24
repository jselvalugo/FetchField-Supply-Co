import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState, FieldNote, buttonClass } from "@fetchfield/ui";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { PageHead } from "@/components/common/PageHead";
import { CatalogTable } from "@/components/catalog/CatalogTable";
import { ServiceAreaCheck } from "@/components/catalog/ServiceAreaCheck";
import { allSlugs, getCategory, getProCategories, getProProducts } from "@/lib/catalog";

export function generateStaticParams() {
  return allSlugs().proCategories.map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const c = await getCategory("pro", category);
  if (!c) return {};
  return { title: `${c.name} for dog parks and properties`, description: `${c.blurb} ${c.intro}`, alternates: { canonical: `/pro/${c.slug}` } };
}

export default async function ProCategory({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const [c, products, cats] = await Promise.all([getCategory("pro", category), getProProducts(category), getProCategories()]);
  if (!c) notFound();
  const withNote = products.find((p) => p.fieldNote);

  return (
    <>
      <div className="wrap"><Breadcrumbs items={[{ label: "Pro", href: "/pro" }, { label: c.name }]} /></div>
      <PageHead eyebrow={c.name} code={c.code} blaze={c.blaze} title={c.name} lede={<p className="m-0">{c.intro}</p>} />
      <div className="wrap section grid gap-12 pt-10 lg:grid-cols-[1fr_18rem]">
        <div>
          {products.length ? (
            <CatalogTable products={products} categories={cats} />
          ) : (
            <EmptyState title={`No ${c.name.toLowerCase()} listed yet`} action={<Link href="/pro/quote" className={buttonClass("secondary")}>Ask for a quote</Link>}>
              <p className="m-0">We're finalizing specs with manufacturers. Tell us what you need and we'll quote it directly.</p>
            </EmptyState>
          )}
        </div>
        <aside className="grid content-start gap-8">
          {c.slug === "service-plans" && (
            <div className="border-2 border-text p-5">
              <h2 className="m-0 mb-3 text-lg font-semibold">Is your site in a service area?</h2>
              <ServiceAreaCheck />
            </div>
          )}
          <div className="grid gap-2 border-t-2 border-text pt-4 text-sm">
            <p className="eyebrow m-0">Buying for a public agency?</p>
            <p className="m-0">W-9, COI, tax-exempt handling and net-30 terms are on the procurement page.</p>
            <Link href="/pro/procurement" className="link font-semibold">Procurement documents</Link>
          </div>
          {withNote?.fieldNote && <FieldNote from={withNote.fieldNote.from}><p>{withNote.fieldNote.text}</p></FieldNote>}
        </aside>
      </div>
    </>
  );
}
