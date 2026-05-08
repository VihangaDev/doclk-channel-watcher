# Doc.lk Channel Watcher

[![CI](https://github.com/VihangaDev/doclk-channel-watcher/actions/workflows/ci.yml/badge.svg)](https://github.com/VihangaDev/doclk-channel-watcher/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Self-hosted Doc.lk / Doc990 doctor availability watcher with Telegram alerts.

Doc.lk sessions can move between available, full, canceled, holiday, and contact-hospital states. This project checks channel pages on a schedule and sends a Telegram message when a bookable session appears.

## Features

- Personal watcher for one Telegram chat
- Community website where users can subscribe themselves
- Doctor search using Doc.lk search results
- Hospital filtering with an **All** option
- Telegram opt-in flow through `/start <code>`
- Duplicate-alert protection per channel URL
- Safe handling for temporary empty or failed Doc.lk pages
- Linux `systemd` and macOS `launchd` examples

## Quick Start

```bash
git clone https://github.com/VihangaDev/doclk-channel-watcher.git
cd doclk-channel-watcher
npm install
cp .env.example .env
```

Run the website:

```bash
npm run web
```

Open:

```text
http://localhost:3000
```

Run a one-off channel check:

```bash
node src/monitor.js --once --dry-run --url https://www.doc.lk/channel/31317
```

## Usage Modes

### Personal Watcher

Use this when you want the service to monitor one or more channel URLs and notify one Telegram chat.

```bash
DOCLK_URL=https://www.doc.lk/channel/31317
TELEGRAM_BOT_TOKEN=123456:your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
npm start
```

Multiple URLs:

```bash
DOCLK_URLS=https://www.doc.lk/channel/31317,https://www.doc.lk/channel/3012
```

### Community Website

Use this when you want other people to search doctors and subscribe themselves.

```bash
PORT=3000
TELEGRAM_BOT_TOKEN=123456:your-bot-token
TELEGRAM_BOT_USERNAME=your_bot_username
npm run web
```

The website flow is:

1. Search a doctor or paste a channel URL.
2. Select **All** or a specific hospital.
3. View sessions for the selected channel.
4. Click **Telegram alerts**.
5. Open the Telegram bot link.
6. Receive alerts when that channel gets a new bookable session.

Telegram requires users to opt in. A bot cannot message people until they open the bot first.

## Documentation

- [Getting Started](docs/GETTING_STARTED.md)
- [Configuration](docs/CONFIGURATION.md)
- [Telegram Setup](docs/TELEGRAM.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Operations](docs/OPERATIONS.md)
- [Development](docs/DEVELOPMENT.md)
- [Security](SECURITY.md)
- [Contributing](CONTRIBUTING.md)

## Commands

```bash
npm run web            # Website and community subscription worker
npm start              # Personal watcher
npm run check          # Personal watcher, one check
npm run telegram:test  # Send a Telegram test message
npm test               # Run tests
```

## How Detection Works

The watcher parses Doc.lk channel pages and reads every `.ui-component-sessions` row. A session is considered open only when the Book button is enabled and has a real booking URL.

Blocked statuses such as `Session Full`, `Canceled`, `Contact Hospital`, and `Holiday` are ignored.

Doctor search uses Doc.lk's public search pages:

- `/search?doctor=...&hospital=0&specialization=0&date=`
- `/doctors/suggestions`

## Storage

By default the project stores state in JSON files under `.state`.

This keeps self-hosting simple. For a larger public service, use SQLite or Postgres for subscriptions, channel state, audit logs, and admin tooling.

## Disclaimer

This project is independent and is not affiliated with Doc.lk, Doc990, Dialog Axiata, any hospital, or any medical provider.

Use a reasonable polling interval and respect the target site's availability and terms.
