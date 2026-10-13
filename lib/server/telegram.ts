// Server-side only: imported from route handlers, never from client components.

/** Escape text before putting it inside a Telegram HTML message. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Send a message to the store owner's Telegram chat.
 * Reads TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID on the server only, so the
 * bot token is never sent to the browser. Never throws.
 */
export async function notifyTelegram(html: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: html.slice(0, 4000),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch (error) {
    console.error("Telegram notification failed", error);
  }
}
