"use client";

import { useId, useState } from "react";

type State = "idle" | "sending" | "done" | "error" | "invalid";

/** Launch email list. Signups are stored by /api/launch-list and listed in Admin → Launch list. */
export function LaunchList() {
  const id = useId();
  const [state, setState] = useState<State>("idle");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setState("invalid");
    setState("sending");
    try {
      const res = await fetch("/api/launch-list", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, audience: String(data.get("audience") ?? "both"), website: String(data.get("company-website") ?? "") }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div role="status" className="launch-done">
        <p className="launch-done__t">You're on the list.</p>
        <p className="m-0">One email when we open. That's it.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="launch-form" aria-describedby={`${id}-note`}>
      <fieldset className="m-0 border-0 p-0">
        <legend className="label mb-2">I'm interested in</legend>
        <div className="seg seg--dark">
          {[
            ["parks", "Equipment for a park or property"],
            ["dog", "Gear for my dog"],
            ["both", "Both"],
          ].map(([v, l], i) => (
            <span key={v}>
              <input type="radio" id={`${id}-${v}`} name="audience" value={v} defaultChecked={i === 2} />
              <label htmlFor={`${id}-${v}`}>{l}</label>
            </span>
          ))}
        </div>
      </fieldset>
      <div className="launch-form__row">
        <div className="field grow">
          <label htmlFor={`${id}-email`}>Email</label>
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" required className="input launch-input"
            aria-invalid={state === "invalid"} aria-describedby={state === "invalid" ? `${id}-err` : undefined} onChange={() => state !== "idle" && setState("idle")} />
        </div>
        <button type="submit" className="ff-btn ff-btn--action ff-btn--lg self-end" disabled={state === "sending"}>
          {state === "sending" ? "Adding…" : "Tell me when you open"}
        </button>
      </div>
      <div className="ff-sr" aria-hidden>
        <label htmlFor={`${id}-hp`}>Leave empty</label>
        <input id={`${id}-hp`} name="company-website" tabIndex={-1} autoComplete="off" />
      </div>
      <p aria-live="polite" className="m-0 min-h-5 text-sm">
        {state === "invalid" && <span id={`${id}-err`} className="launch-err">Enter a valid email address.</span>}
        {state === "error" && <span className="launch-err">That didn't go through. Try again in a minute.</span>}
      </p>
      <p id={`${id}-note`} className="m-0 text-xs text-muted">One email when we open. We don't share or sell the list.</p>
    </form>
  );
}
