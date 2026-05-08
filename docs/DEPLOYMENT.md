# Deployment

The service can run anywhere Node.js 20+ is available.

## Linux With systemd

Clone and configure:

```bash
git clone https://github.com/VihangaDev/doclk-channel-watcher.git
cd doclk-channel-watcher
npm ci --omit=dev
cp .env.example .env
mkdir -p logs
```

Edit `.env`.

Install the user service:

```bash
mkdir -p ~/.config/systemd/user
cp systemd/doclk-channel-watcher.service.example \
  ~/.config/systemd/user/doclk-channel-watcher.service
systemctl --user daemon-reload
systemctl --user enable doclk-channel-watcher.service
systemctl --user start doclk-channel-watcher.service
loginctl enable-linger "$(id -u)"
```

Check:

```bash
systemctl --user status doclk-channel-watcher.service --no-pager -l
tail -f logs/monitor.out.log
```

The included service starts community website mode:

```text
node src/community-service.js
```

For personal watcher mode, change `ExecStart` to:

```text
/usr/bin/node src/monitor.js
```

## macOS With launchd

```bash
mkdir -p ~/Library/LaunchAgents logs
sed "s#__PROJECT_DIR__#$(pwd)#g; s#__NODE_PATH__#$(which node)#g" \
  launchd/com.doclk.channel-watcher.plist.example \
  > ~/Library/LaunchAgents/com.doclk.channel-watcher.plist
launchctl load ~/Library/LaunchAgents/com.doclk.channel-watcher.plist
launchctl start com.doclk.channel-watcher
```

Logs:

```bash
tail -f logs/monitor.out.log
tail -f logs/monitor.err.log
```

## Reverse Proxy

For a public website, put the Node app behind Caddy, Nginx, or another reverse proxy with HTTPS.

Example Caddyfile:

```text
watcher.example.com {
  reverse_proxy 127.0.0.1:3000
}
```

Then set:

```bash
PUBLIC_BASE_URL=https://watcher.example.com
```

## Search-Only Demo

Use this when you want a public preview without Telegram subscriptions:

```bash
PORT=3000 TELEGRAM_BOT_TOKEN= TELEGRAM_POLLING=false npm run web
```

The website can search doctors and check sessions. It reports demo mode in `/api/health` and disables Telegram subscription controls.

This still needs a Node.js server. A static host such as GitHub Pages cannot run the backend routes that talk to Doc.lk.

## Usable Public Alerts

Use this when people should receive Telegram notifications from the website:

```bash
PORT=3000
PUBLIC_BASE_URL=https://watcher.example.com
TELEGRAM_BOT_TOKEN=123456:your-bot-token
TELEGRAM_BOT_USERNAME=your_bot_username
npm run web
```

Before opening the service publicly:

- Use a fresh Telegram bot token.
- Put the app behind HTTPS.
- Keep `CHECK_INTERVAL_SECONDS` reasonable.
- Move subscription storage to SQLite or Postgres if usage grows beyond a small community.

## Recommended Production Notes

- Keep `CHECK_INTERVAL_SECONDS` reasonable.
- Use HTTPS for public deployments.
- Back up `.state` if using JSON storage.
- Use SQLite or Postgres before running a large public service.
- Monitor service logs for Doc.lk timeouts or 5xx responses.
