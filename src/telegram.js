export async function sendTelegramMessage({ botToken, chatId, text, fetchImpl = fetch }) {
  if (!botToken || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required");
  }

  const response = await fetchImpl(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: false,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    const description = payload.description || `HTTP ${response.status}`;
    throw new Error(`Telegram send failed: ${description}`);
  }

  return payload;
}

export async function getTelegramBot({ botToken, fetchImpl = fetch }) {
  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is required");
  }

  const response = await fetchImpl(`https://api.telegram.org/bot${botToken}/getMe`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.ok === false) {
    const description = payload.description || `HTTP ${response.status}`;
    throw new Error(`Telegram getMe failed: ${description}`);
  }

  return payload.result;
}

export async function getTelegramUpdates({
  botToken,
  offset,
  timeoutSeconds = 25,
  fetchImpl = fetch,
}) {
  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is required");
  }

  const url = new URL(`https://api.telegram.org/bot${botToken}/getUpdates`);
  if (offset) {
    url.searchParams.set("offset", String(offset));
  }
  url.searchParams.set("timeout", String(timeoutSeconds));
  url.searchParams.set("allowed_updates", JSON.stringify(["message"]));

  const response = await fetchImpl(url);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.ok === false) {
    const description = payload.description || `HTTP ${response.status}`;
    throw new Error(`Telegram getUpdates failed: ${description}`);
  }

  return payload.result || [];
}
