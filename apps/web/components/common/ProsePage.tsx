import type { ReactNode } from "react";
import { PageHead } from "./PageHead";

export function ProsePage({ eyebrow, title, lede, updated, draft, children }: {
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
  updated?: string;
  /** Marks legal text that still needs counsel review. */
  draft?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <PageHead eyebrow={eyebrow} title={title} lede={lede} />
      <div className="wrap section grid gap-10 pt-10 lg:grid-cols-[1fr_16rem]">
        <article className="prose">{children}</article>
        <aside className="grid content-start gap-3 text-sm lg:border-l lg:border-line lg:pl-6">
          {updated && <p className="m-0"><span className="eyebrow block">Last updated</span><span className="mono">{updated}</span></p>}
          {draft && (
            <p className="m-0 border-2 border-text p-3">
              <span className="eyebrow block">Draft</span>
              This page is pending legal review before launch.
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
