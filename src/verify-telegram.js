import "dotenv/config";

import { sendTelegramMessage } from "./telegram.js";

await sendTelegramMessage({
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID,
  text: `Doc.lk Channel Watcher Telegram test OK.\n${new Date().toISOString()}`,
});

console.log("Telegram test message sent.");
