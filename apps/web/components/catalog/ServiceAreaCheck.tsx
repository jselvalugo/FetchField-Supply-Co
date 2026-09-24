"use client";

import { useId, useState } from "react";
import { Button } from "@fetchfield/ui";
import { isValidZip } from "@fetchfield/suppliers/delivery";

/**
 * Service-area check (spec §6). The list of covered ZIP prefixes is empty
 * until regional service areas are decided (spec §15 open question), so
 * every ZIP currently gets the honest "we'll confirm" answer.
 */
const SERVICE_ZIP3: string[] = [];

export function ServiceAreaCheck() {
  const id = useId();
  const [zip, setZip] = useState("");
  const [result, setResult] = useState<null | "covered" | "unknown" | "invalid">(null);
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isValidZip(zip)) return setResult("invalid");
        setResult(SERVICE_ZIP3.includes(zip.slice(0, 3)) ? "covered" : "unknown");
      }}
    >
      <div className="field">
        <label htmlFor={id}>Site ZIP code</label>
        <div className="flex gap-2">
          <input id={id} className="input mono max-w-32" inputMode="numeric" autoComplete="postal-code" maxLength={10} value={zip}
            onChange={(e) => { setZip(e.target.value); setResult(null); }} aria-invalid={result === "invalid"} aria-describedby={`${id}-r`} />
          <Button type="submit" variant="secondary">Check</Button>
        </div>
      </div>
      <p id={`${id}-r`} aria-live="polite" className="m-0 text-sm">
        {result === "invalid" && <span className="error-text">Enter a 5-digit ZIP.</span>}
        {result === "covered" && <>We have a crew that covers <span className="mono">{zip}</span>. Add stations to your quote to get started.</>}
        {result === "unknown" && (
          <>We haven't confirmed a crew for <span className="mono">{zip}</span> yet. Add the plan to your quote and we'll tell you within one business day whether we can cover it.</>
        )}
      </p>
    </form>
  );
}
