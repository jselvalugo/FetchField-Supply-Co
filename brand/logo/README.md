# FetchField logo

The mark is a trail blaze: a painted square in field green, with a ball resting above a chalk line. The ball stands for fetch and the chalk line for the field. It has two shapes and no detail that disappears at small sizes, so it still reads at 16px and works when painted on a post, stamped into a spec plate, or used as a favicon.

The wordmark is Archivo 800 at width 112, with "SUPPLY CO." in Archivo 600 at width 100. Both are converted to outlines, so the SVGs don't need the font installed. The rule after "SUPPLY CO." is taken from park-sign layouts.

## Files

| File | Use |
|---|---|
| `mark.svg` | Default mark: field green blaze on light surfaces |
| `mark-deep.svg` | Field-deep blaze for when more contrast is needed |
| `mark-chalk.svg` | Chalk blaze on dark green surfaces |
| `mark-mono.svg` | One-color knockout using `currentColor`. Use it inline for stamping, embossing, single-ink print, or a monochrome favicon |
| `lockup-horizontal.svg` / `-reversed` | Header and footer |
| `lockup-stacked.svg` / `-reversed` | Square placements, signage, packaging |

## Rules

- Colors: field `#2F5D3A`, field-deep `#1E3D26`, chalk `#F4F1E8`. Never use clay in the logo, because clay is reserved for actions.
- Clear space: at least half the mark's width (32 units on the 64-unit grid) on every side.
- Minimum size: mark 16px; horizontal lockup 24px tall.
- Don't stretch, recolor, outline, add shadows, or put it on a photo without a solid green or chalk plate.
- The ball never becomes a paw print, bone, or dog face. Keeping it plain is what makes the mark ours.

## Regenerating

The lockups were generated from Archivo (OFL, via `@fontsource-variable/archivo`) with fontTools, with the variable axes set to the values above.
