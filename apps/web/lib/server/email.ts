import "server-only";

/**
 * Transactional email. Sends through Resend when RESEND_API_KEY is set;
 * otherwise logs a one-line notice (development). Never throws into the
 * request: a failed email must not lose a submitted quote or order.
 */
export async function sendEmail(msg: { to: string; subject: string; text: string }): Promise<"sent" | "logged" | "failed"> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.info(`[email:dev] to=${msg.to.replace(/(.).+@/, "$1***@")} subject="${msg.subject}"`);
    return "logged";
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, text: msg.text }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
