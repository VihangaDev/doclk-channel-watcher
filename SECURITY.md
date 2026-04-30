# Security

Do not open a public issue with real Telegram bot tokens, chat ids, or private server details.

If a token is accidentally exposed:

1. Revoke it with `@BotFather`.
2. Create a new token.
3. Update `.env` on every machine running the watcher.
4. Restart the service.
