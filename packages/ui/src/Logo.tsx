import { cx } from "./cx";

/** The trail-blaze mark: ball above a chalk line. Matches brand/logo/mark.svg. */
export function LogoMark({ size = 32, className, inverse = false }: { size?: number; className?: string; inverse?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden focusable="false" className={cx("ff-mark", inverse && "ff-mark--inverse", className)}>
      <rect width="64" height="64" rx="5" className="ff-mark__plate" />
      <circle cx="40" cy="27" r="9" className="ff-mark__ink" />
      <rect x="12" y="42" width="40" height="5" className="ff-mark__ink" />
    </svg>
  );
}

/** Horizontal lockup in live type (Archivo is already loaded site-wide). */
export function Logo({ className, inverse = false, compact = false }: { className?: string; inverse?: boolean; compact?: boolean }) {
  return (
    <span className={cx("ff-logo", inverse && "ff-logo--inverse", className)}>
      <LogoMark size={compact ? 28 : 36} inverse={inverse} />
      <span className="ff-logo__type">
        <span className="ff-logo__name">FetchField</span>
        {!compact && (
          <span className="ff-logo__sub">
            Supply Co.<span className="ff-logo__rule" aria-hidden />
          </span>
        )}
      </span>
    </span>
  );
}
