# Telegram Setup

Telegram is used for alerts and subscriptions.

## Create A Bot

1. Open Telegram.
2. Message `@BotFather`.
3. Run `/newbot`.
4. Choose a name and username.
5. Copy the bot token.

Set:

```bash
TELEGRAM_BOT_TOKEN=123456:your-bot-token
```

## Personal Watcher Chat ID

For personal mode, the service needs a chat id.

1. Send `/start` to your bot.
2. Open:

   ```text
   https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates
   ```

3. Find `message.chat.id`.
4. Set:

   ```bash
   TELEGRAM_CHAT_ID=your-chat-id
   ```

Test:

```bash
npm run telegram:test
```

## Community Website Bot Username

For community mode, set the bot username:

```bash
TELEGRAM_BOT_USERNAME=your_bot_username
```

The website creates links like:

```text
https://t.me/your_bot_username?start=<subscription-code>
```

When the user opens the link, Telegram sends `/start <subscription-code>` to the bot. The service activates that subscription and stores the user's chat id.

## Stop Subscriptions

Users can send:

```text
/stop
```

The service disables all active subscriptions for that Telegram chat.

## Token Safety

Never commit a real bot token.

If a token is exposed:

1. Revoke it in `@BotFather`.
2. Create a new token.
3. Update `.env` on every server.
4. Restart the service.
