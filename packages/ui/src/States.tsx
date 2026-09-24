import type { ReactNode } from "react";
import { cx } from "./cx";

/** "End of trail" empty state: a dashed path that stops at a trail-end blaze. */
export function EmptyState({ title, children, action, className }: { title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("ff-empty", className)}>
      <svg viewBox="0 0 160 40" width="160" height="40" aria-hidden className="ff-empty__trail">
        <path d="M4 30 C 40 30, 50 10, 90 14 S 128 26, 132 20" />
        <g transform="translate(136 8)">
          <rect width="20" height="20" rx="2" />
          <path d="M5 5l10 10M15 5 5 15" />
        </g>
      </svg>
      <h2 className="ff-empty__title">{title}</h2>
      {children ? <div className="ff-empty__body">{children}</div> : null}
      {action ? <div className="ff-empty__action">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title = "That didn't load", children, action }: { title?: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="ff-error" role="alert">
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden className="ff-error__mark">
        <path d="M12 2 22.5 12 12 22.5 1.5 12Z" />
        <path d="M12 7.5v6M12 16.5v.5" />
      </svg>
      <div>
        <h2 className="ff-error__title">{title}</h2>
        {children ? <div className="ff-error__body">{children}</div> : null}
        {action ? <div className="ff-error__action">{action}</div> : null}
      </div>
    </div>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={cx("ff-skel", className)} style={style} aria-hidden />;
}
