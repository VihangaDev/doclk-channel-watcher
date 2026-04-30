# Doc.lk Channel Watcher

Monitor Doc.lk / Doc990 doctor channel pages and send a Telegram alert when a bookable appointment appears.

This is useful when sessions are usually full, canceled, or disabled, but occasionally reopen at odd hours.

## Features

- Watches one or many Doc.lk channel URLs
- Detects real open sessions from the rendered session rows
- Sends Telegram alerts only when a session newly opens
- Persists state to avoid repeated duplicate alerts
- Supports one-off checks, dry runs, and continuous polling
- Works on a VPS, Raspberry Pi, NAS, or always-on laptop

## Requirements

- Node.js 20 or newer
- A Telegram bot token from `@BotFather`
- A Telegram chat id for the user or group that should receive alerts

## Install

```bash
git clone https://github.com/YOUR_USERNAME/doclk-channel-watcher.git
cd doclk-channel-watcher
npm install
cp .env.example .env
```

## Configure

Edit `.env`:

```bash
DOCLK_URL=https://www.doc.lk/channel/31317
CHECK_INTERVAL_SECONDS=60
TELEGRAM_BOT_TOKEN=123456:your-bot-token
TELEGRAM_CHAT_ID=123456789
```

To watch multiple doctors or hospitals, use `DOCLK_URLS`:

```bash
DOCLK_URLS=https://www.doc.lk/channel/31317,https://www.doc.lk/channel/12345
```

`DOCLK_URLS` also accepts newline-separated values.

## Find Your Telegram Chat ID

1. Create a bot by messaging `@BotFather` in Telegram.
2. Send `/start` to your new bot.
3. Open this URL in a browser:

   ```text
   https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates
   ```

4. Use `message.chat.id` as `TELEGRAM_CHAT_ID`.

You can verify Telegram delivery with:

```bash
npm run telegram:test
```

## Run

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

## Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DOCLK_URL` | Yes, unless `DOCLK_URLS` or `--url` is used | | Single Doc.lk channel URL |
| `DOCLK_URLS` | Yes, unless `DOCLK_URL` or `--url` is used | | Comma- or newline-separated channel URLs |
| `TELEGRAM_BOT_TOKEN` | No for dry runs, yes for alerts | | Telegram bot token |
| `TELEGRAM_CHAT_ID` | No for dry runs, yes for alerts | | Telegram user/group chat id |
| `CHECK_INTERVAL_SECONDS` | No | `60` | Polling interval, minimum enforced value is 15 seconds |
| `FETCH_TIMEOUT_SECONDS` | No | `20` | Timeout for loading a Doc.lk page |
| `ERROR_NOTIFY_AFTER` | No | `3` | Consecutive failures before sending a Telegram warning |
| `STATE_FILE` | No | `.state/doclk-watcher-state.json` | State file used for duplicate-alert suppression |
| `NOTIFY_ON_START` | No | `false` | Send a Telegram message when the watcher starts |

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

State is stored by channel URL, so an alert is sent when a session changes from closed to open. Existing open sessions do not generate repeated alerts every minute.

## Development

```bash
npm install
npm test
node src/monitor.js --once --dry-run --url https://www.doc.lk/channel/31317
```

Do not commit `.env`, `.state`, logs, or any real Telegram token.

## Disclaimer

This project is an independent availability watcher. It is not affiliated with Doc.lk, Doc990, or any hospital. Use a reasonable polling interval and respect the target site's terms and availability.
