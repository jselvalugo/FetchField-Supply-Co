export type AlertCode =
  | "sync_failed"
  | "sync_stale"
  | "margin_below_floor"
  | "sold_out"
  | "order_needs_attention"
  | "order_delay_notice"
  | "auth_expired";

export interface Alert {
  level: "info" | "warn" | "critical";
  code: AlertCode;
  message: string;
  /** Internal record id (variant, supplier order…) for the admin link. */
  ref?: string;
}

export interface AlertSink {
  alert(a: Alert): Promise<void> | void;
}

export const consoleAlerts: AlertSink = {
  alert: (a) => console.warn(`[alert:${a.level}] ${a.code} ${a.ref ?? ""} ${a.message}`),
};
