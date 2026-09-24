"use client";

import { Button, ErrorState } from "@fetchfield/ui";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="wrap section max-w-2xl">
      <ErrorState title="Something on our end broke" action={<Button variant="secondary" onClick={reset}>Try again</Button>}>
        <p className="m-0">Your cart and quote list are saved in this browser. If it keeps happening, email us and we'll sort it out.</p>
      </ErrorState>
    </div>
  );
}
