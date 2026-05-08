# Doc.lk Channel Watcher

Monitor Doc.lk / Doc990 doctor channel pages and send Telegram alerts when bookable appointments appear.

This is useful when sessions are usually full, canceled, or disabled, but occasionally reopen at odd hours.

## Product Modes

This repository supports two deployment styles:

- **Personal watcher:** monitor one or many URLs and notify one Telegram chat.
- **Community website:** run a small website where users paste a Doc.lk channel URL, check current availability, and opt into Telegram alerts.

Telegram requires user opt-in. A bot cannot message random people directly. In community mode, the website creates a short subscription code, the user opens `https://t.me/<bot>?start=<code>`, and the bot stores that Telegram chat id for future alerts.

## Features

- Watches one or many Doc.lk channel URLs
- Searches doctors through Doc.lk search and filters results by hospital
- Detects real open sessions from the rendered session rows
- Sends Telegram alerts only when a session newly opens
- Persists state to avoid repeated duplicate alerts
- Includes a self-hosted website and Telegram subscription flow
- Supports one-off checks, dry runs, and continuous polling

## Requirements

- Node.js 20 or newer
- A Telegram bot token from `@BotFather`
- A Telegram chat id for personal mode, or a Telegram bot username for community mode

## Install

```bash
git clone https://github.com/YOUR_USERNAME/doclk-channel-watcher.git
cd doclk-channel-watcher
npm install
cp .env.example .env
```

## Personal Mode

Edit `.env`:

```bash
DOCLK_URL=https://www.doc.lk/channel/31317
CHECK_INTERVAL_SECONDS=60
TELEGRAM_BOT_TOKEN=123456:your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

To watch multiple doctors or hospitals, use `DOCLK_URLS`:

```bash
DOCLK_URLS=https://www.doc.lk/channel/31317,https://www.doc.lk/channel/12345
```

Check once:

```bash
npm run check
```

Run continuously:

```bash
npm start
```

Dry run without sending Telegram messages or updating state:

```bash
node src/monitor.js --once --dry-run --url https://www.doc.lk/channel/31317
```

## Community Website Mode

Edit `.env`:

```bash
PORT=3000
CHECK_INTERVAL_SECONDS=60
TELEGRAM_BOT_TOKEN=123456:your-bot-token
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_POLLING=true
SUBSCRIPTION_FILE=.state/subscriptions.json
COMMUNITY_STATE_FILE=.state/community-monitor-state.json
```

Start the website and subscription worker:

```bash
npm run web
```

Open `http://localhost:3000`, paste a Doc.lk channel URL, check live sessions, then choose Telegram alerts.

The website also supports doctor search. Search by doctor name, choose **All** or one of the returned hospitals, then open the matching channel to inspect sessions or subscribe.

## Find Telegram Values

Create a bot by messaging `@BotFather` in Telegram. For community mode, use the bot username from BotFather as `TELEGRAM_BOT_USERNAME`.

For personal mode, send `/start` to your bot and open:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates
```

Use `message.chat.id` as `TELEGRAM_CHAT_ID`.

Verify Telegram delivery:

```bash
npm run telegram:test
```

## Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DOCLK_URL` | Personal mode only, unless `DOCLK_URLS` or `--url` is used | | Single Doc.lk channel URL |
| `DOCLK_URLS` | Personal mode only, unless `DOCLK_URL` or `--url` is used | | Comma- or newline-separated channel URLs |
| `TELEGRAM_BOT_TOKEN` | No for dry runs, yes for alerts/subscriptions | | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Personal mode only | | Telegram user/group chat id |
| `TELEGRAM_BOT_USERNAME` | No | fetched from Telegram | Bot username used to create subscription links |
| `TELEGRAM_POLLING` | No | `true` | Set to `false` only for local UI testing with a fake token |
| `CHECK_INTERVAL_SECONDS` | No | `60` | Polling interval, minimum enforced value is 15 seconds |
| `FETCH_TIMEOUT_SECONDS` | No | `20` | Timeout for loading a Doc.lk page |
| `ERROR_NOTIFY_AFTER` | No | `3` | Consecutive failures before sending a Telegram warning in personal mode |
| `STATE_FILE` | No | `.state/doclk-watcher-state.json` | Personal-mode duplicate-alert state |
| `NOTIFY_ON_START` | No | `false` | Send a Telegram message when personal mode starts |
| `PORT` | No | `3000` | Website port for `npm run web` |
| `PUBLIC_BASE_URL` | No | | Public website URL, useful behind a reverse proxy |
| `SUBSCRIPTION_FILE` | No | `.state/subscriptions.json` | Community-mode subscription store |
| `COMMUNITY_STATE_FILE` | No | `.state/community-monitor-state.json` | Community-mode duplicate-alert state |

## How Community Notifications Work

1. A user searches a doctor or checks a Doc.lk channel URL on the website.
2. If searching, the user selects **All** or a specific hospital and opens the correct channel.
3. The website creates a short pending subscription code.
4. The user opens Telegram with `/start <code>`.
5. The bot activates the subscription and stores the user's chat id.
6. The service monitors each unique channel URL once per interval.
7. When a new bookable session appears, every subscriber for that channel gets the alert.

The default storage is JSON files under `.state`. That keeps self-hosting simple. For a larger public service, replace the file store with Postgres or SQLite and add moderation/admin tools.

## Keep It Running On Linux

Create a user-level `systemd` service from the included template:

```bash
mkdir -p ~/.config/systemd/user logs
cp systemd/doclk-channel-watcher.service.example \
  ~/.config/systemd/user/doclk-channel-watcher.service
```

Enable it:

```bash
systemctl --user daemon-reload
systemctl --user enable doclk-channel-watcher.service
systemctl --user start doclk-channel-watcher.service
loginctl enable-linger "$(id -u)"
```

Check status:

```bash
systemctl --user status doclk-channel-watcher.service --no-pager -l
tail -f logs/monitor.out.log
```

## Keep It Running On macOS

Create a launch agent from the included template:

```bash
mkdir -p ~/Library/LaunchAgents logs
sed "s#__PROJECT_DIR__#$(pwd)#g; s#__NODE_PATH__#$(which node)#g" \
  launchd/com.doclk.channel-watcher.plist.example \
  > ~/Library/LaunchAgents/com.doclk.channel-watcher.plist
launchctl load ~/Library/LaunchAgents/com.doclk.channel-watcher.plist
launchctl start com.doclk.channel-watcher
```

## How Detection Works

The watcher parses every `.ui-component-sessions` row on a Doc.lk channel page. A session is treated as open when its `Book` button is enabled and has a real booking URL. Known blocked statuses such as `Session Full`, `Canceled`, `Contact Hospital`, and `Holiday` are ignored.

Doctor search uses Doc.lk's public search flow: `/search?doctor=...&hospital=0&specialization=0&date=` for results and `/doctors/suggestions` for autocomplete. Results are parsed from `.doctor_channel` rows and grouped by hospital.

State is stored by channel URL, so an alert is sent when a session changes from closed to open. Existing open sessions do not generate repeated alerts every minute.

## Development

```bash
npm install
npm test
node src/monitor.js --once --dry-run --url https://www.doc.lk/channel/31317
npm run web
```

Do not commit `.env`, `.state`, logs, or any real Telegram token.

## Disclaimer

This project is an independent availability watcher. It is not affiliated with Doc.lk, Doc990, or any hospital. Use a reasonable polling interval and respect the target site's terms and availability.
