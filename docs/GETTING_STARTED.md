# Getting Started

This guide gets the project running locally.

## Requirements

- Node.js 20 or newer
- npm
- A Doc.lk channel URL for testing

Telegram is optional for local dry runs. It is required when sending real alerts.

## Install

```bash
git clone https://github.com/VihangaDev/doclk-channel-watcher.git
cd doclk-channel-watcher
npm install
cp .env.example .env
```

## Start The Website

```bash
npm run web
```

Open:

```text
http://localhost:3000
```

For a search-only local demo without Telegram:

```bash
PORT=3000 TELEGRAM_BOT_TOKEN= TELEGRAM_POLLING=false npm run web
```

Try searching:

```text
kapila
```

Then choose **All** or a hospital and open the session list.

## Run A One-Off Check

```bash
node src/monitor.js --once --dry-run --url https://www.doc.lk/channel/31317
```

`--dry-run` prints the notification preview and does not update state.

## Run The Personal Watcher

Edit `.env`:

```bash
DOCLK_URL=https://www.doc.lk/channel/31317
TELEGRAM_BOT_TOKEN=123456:your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

Start:

```bash
npm start
```

## Run The Community Website

Edit `.env`:

```bash
PORT=3000
TELEGRAM_BOT_TOKEN=123456:your-bot-token
TELEGRAM_BOT_USERNAME=your_bot_username
```

Start:

```bash
npm run web
```

Users can now search doctors and subscribe through Telegram.
