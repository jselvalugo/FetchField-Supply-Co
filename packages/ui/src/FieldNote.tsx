import type { ReactNode } from "react";
import { cx } from "./cx";

/**
 * A short first-person tip from our crew (spec §3.4), styled like a note
 * pencilled in a field guide's margin. Use sparingly: one per page at most.
 */
export function FieldNote({ children, from, className }: { children: ReactNode; from: string; className?: string }) {
  return (
    <aside className={cx("ff-note", className)} aria-label="Field note">
      <p className="ff-note__label">Field note</p>
      <div className="ff-note__body">{children}</div>
      <p className="ff-note__from">— {from}</p>
    </aside>
  );
}
