"use client";

import { Button } from "@fetchfield/ui";

export function PrintButton() {
  return <Button onClick={() => window.print()}>Print or save as PDF</Button>;
}
