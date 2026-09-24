/**
 * Supplier descriptions arrive as HTML from a third party. We never render it.
 * This reduces it to plain text for the curator's reference while they write
 * our own copy (spec §8.3 step 3). Script/style bodies are dropped entirely.
 */
export function htmlToPlainText(html: string, maxLength = 20_000): string {
  const text = html
    .slice(0, 500_000)
    .replace(/<(script|style|iframe|object|embed|noscript)[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#\d+;|&[a-z]+;/gi, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}
