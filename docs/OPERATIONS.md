# Operations

## Health Check

Community mode exposes:

```text
GET /api/health
```

Example:

```bash
curl http://localhost:3000/api/health
```

Response:

```json
{
  "ok": true,
  "activeSubscriptions": 4,
  "uniqueChannels": 2
}
```

## Logs

If using the included service examples:

```bash
tail -f logs/monitor.out.log
tail -f logs/monitor.err.log
```

## Common Issues

### Telegram `chat not found`

The user has not opened the bot yet, or the chat id is wrong.

For personal mode, send `/start` to the bot and confirm `TELEGRAM_CHAT_ID`.

For community mode, the user must open the `https://t.me/...` subscription link.

### Doc.lk timeout

Doc.lk can occasionally timeout or return `502`.

The service logs the failure and retries on the next interval.

### No session rows found

This usually means Doc.lk returned an incomplete page. The service treats it as a failed check so existing alert state is not cleared.

### Duplicate alerts

Duplicate alerts should not happen for stable pages. If they do, check whether the state file is being deleted or whether the deployment path changed.

## Backup

Back up `.state` if community subscriptions matter:

```bash
tar -czf doclk-state-backup.tgz .state
```

## Scaling Notes

The JSON store is intended for small self-hosted deployments.

For a larger public service:

- Move subscriptions to SQLite or Postgres.
- Add admin tools for abuse handling.
- Add per-IP and per-channel rate limits.
- Add queueing for Telegram sends.
- Add structured logs and metrics.
