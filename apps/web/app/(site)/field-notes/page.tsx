import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/common/PageHead";
import { articles } from "@/lib/field-notes";

export const metadata: Metadata = { title: "Field notes: dog park planning and gear advice", description: "Practical answers on planning dog parks, stations and gear from people who install it.", alternates: { canonical: "/field-notes" } };

export default function FieldNotes() {
  return (
    <>
      <PageHead eyebrow="Field notes" title="Field notes" lede={<p className="m-0">Answers to the questions we get most, from people who install stations and walk dogs every day.</p>} />
      <div className="wrap section pt-8">
        <ul className="m-0 list-none border-t-2 border-text p-0">
          {articles.map((a) => (
            <li key={a.slug} className="border-b border-line">
              <Link href={`/field-notes/${a.slug}`} className="group grid gap-2 py-6 no-underline md:grid-cols-[10rem_1fr] md:gap-8">
                <span className="mono text-xs uppercase tracking-[.14em] text-muted">{a.audience}</span>
                <span>
                  <span className="display display--wide block text-2xl group-hover:underline md:text-3xl">{a.title}</span>
                  <span className="mt-2 block text-muted">{a.description}</span>
                  <span className="mono mt-2 block text-xs text-muted">{a.readMinutes} min read · updated {a.updated}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
