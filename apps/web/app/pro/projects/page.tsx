import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, buttonClass } from "@fetchfield/ui";
import { PageHead } from "@/components/common/PageHead";

export const metadata: Metadata = { title: "Installed parks and case studies" };

export default function Projects() {
  return (
    <>
      <PageHead eyebrow="FetchField Pro" title="Installed parks" />
      <div className="wrap section pt-8">
        <EmptyState title="No case studies published yet" action={<Link href="/pro/quote" className={buttonClass("action")}>Start a quote</Link>}>
          <p className="m-0">We only publish installs we can name, with the owner's permission, photos from the site, and real numbers (stations, bags used per month, complaints before and after).</p>
        </EmptyState>
      </div>
    </>
  );
}
