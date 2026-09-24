import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderCss } from "../src/render.ts";

const out = fileURLToPath(new URL("../tokens.css", import.meta.url));
writeFileSync(out, renderCss());
console.log(`wrote ${out}`);
