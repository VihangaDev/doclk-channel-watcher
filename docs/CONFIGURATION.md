# Configuration

Configuration is read from environment variables. For local development, copy `.env.example` to `.env`.

## Personal Watcher

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DOCLK_URL` | Yes, unless `DOCLK_URLS` is used | | Single Doc.lk channel URL |
| `DOCLK_URLS` | Yes, unless `DOCLK_URL` is used | | Comma- or newline-separated channel URLs |
| `TELEGRAM_BOT_TOKEN` | Yes for alerts | | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Yes for alerts | | Telegram user or group chat id |
| `CHECK_INTERVAL_SECONDS` | No | `60` | Polling interval. Minimum enforced value is 15 seconds |
| `FETCH_TIMEOUT_SECONDS` | No | `20` | Timeout for loading Doc.lk pages |
| `ERROR_NOTIFY_AFTER` | No | `3` | Consecutive failures before a warning is sent |
| `STATE_FILE` | No | `.state/doclk-watcher-state.json` | Duplicate-alert state |
| `NOTIFY_ON_START` | No | `false` | Send a startup message |

## Community Website

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | No | `3000` | HTTP port |
| `PUBLIC_BASE_URL` | No | | Public website URL when behind a reverse proxy |
| `TELEGRAM_BOT_TOKEN` | Yes for subscriptions | | Telegram bot token |
| `TELEGRAM_BOT_USERNAME` | No | fetched from Telegram | Bot username used to create subscription links |
| `TELEGRAM_POLLING` | No | `true` | Set to `false` for search-only demos or local UI testing |
| `SUBSCRIPTION_FILE` | No | `.state/subscriptions.json` | Community subscription store |
| `COMMUNITY_STATE_FILE` | No | `.state/community-monitor-state.json` | Community duplicate-alert state |
| `CHECK_INTERVAL_SECONDS` | No | `60` | Polling interval. Minimum enforced value is 15 seconds |
| `FETCH_TIMEOUT_SECONDS` | No | `20` | Timeout for loading Doc.lk pages |

If `TELEGRAM_BOT_TOKEN` is empty in community website mode, the website still allows doctor search and direct channel checks. Telegram subscription controls are disabled and `/api/health` reports demo mode.

## URL Format

Supported channel URLs look like:

```text
https://www.doc.lk/channel/31317
```

The service normalizes `doc.lk/channel/31317` and `https://doc.lk/channel/31317?#` to the canonical form.

Non-Doc.lk URLs are rejected.
