import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

export type ButtonVariant = "action" | "secondary" | "quiet" | "inverse";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Class names for anything that should look like a button (including links).
 * `action` is the only clay element on a screen (spec §3.2: one accent, actions only).
 */
export function buttonClass(variant: ButtonVariant = "action", size: ButtonSize = "md", extra?: string) {
  return cx("ff-btn", `ff-btn--${variant}`, `ff-btn--${size}`, extra);
}

export function Button({
  variant = "action",
  size = "md",
  className,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}
