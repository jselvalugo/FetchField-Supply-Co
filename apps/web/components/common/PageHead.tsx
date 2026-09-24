import type { ReactNode } from "react";
import { TrailMarker, cx, type BlazeShape } from "@fetchfield/ui";

export function PageHead({ eyebrow, title, lede, blaze, code, children, dark }: {
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
  blaze?: BlazeShape;
  code?: string;
  children?: ReactNode;
  dark?: boolean;
}) {
  return (
    <div className={cx("page-head", dark && "turf on-dark border-b-0")}>
      <div className="wrap">
        {(eyebrow || blaze) && (
          <p className="eyebrow m-0 flex items-center gap-2">
            {blaze && <TrailMarker shape={blaze} size={14} tone={dark ? "chalk" : "brand"} />}
            {code && <span>{code}</span>}
            {eyebrow && <span>{code ? "· " : ""}{eyebrow}</span>}
          </p>
        )}
        <h1 className="display display--wide page-head__title">{title}</h1>
        {lede && <div className="lede page-head__lede">{lede}</div>}
        {children}
      </div>
    </div>
  );
}
