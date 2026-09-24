import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { JsonLd } from "@/components/common/JsonLd";
import { articles, findArticle } from "@/lib/field-notes";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = findArticle(slug);
  return a ? { title: a.title, description: a.description, alternates: { canonical: `/field-notes/${a.slug}` } } : {};
}

export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = findArticle(slug);
  if (!a) notFound();
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: a.title, dateModified: a.updated, author: { "@type": "Organization", name: site.name }, publisher: { "@type": "Organization", name: site.name } }} />
      <div className="wrap"><Breadcrumbs items={[{ label: "Field notes", href: "/field-notes" }, { label: a.title }]} /></div>
      <article className="wrap section grid gap-10 pt-8 lg:grid-cols-[1fr_16rem]">
        <div>
          <p className="eyebrow m-0">{a.audience} · {a.readMinutes} min read</p>
          <h1 className="display display--wide mt-3 mb-8 max-w-4xl text-4xl md:text-6xl">{a.title}</h1>
          <div className="prose text-lg">{a.body}</div>
        </div>
        <aside className="grid content-start gap-3 text-sm lg:border-l lg:border-line lg:pl-6">
          <p className="m-0"><span className="eyebrow block">Updated</span><span className="mono">{a.updated}</span></p>
          <p className="eyebrow m-0 mt-4">Products mentioned</p>
          <ul className="m-0 grid list-none gap-2 p-0">
            {a.related.map((r) => <li key={r.href}><Link className="link font-semibold" href={r.href}>{r.label}</Link></li>)}
          </ul>
        </aside>
      </article>
    </>
  );
}
