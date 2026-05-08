# Development

## Install

```bash
npm install
```

## Run Tests

```bash
npm test
```

## Run Website Locally

```bash
npm run web
```

Open:

```text
http://localhost:3000
```

For UI testing without Telegram polling:

```bash
PORT=3000 \
TELEGRAM_BOT_TOKEN=fake-token \
TELEGRAM_BOT_USERNAME=example_bot \
TELEGRAM_POLLING=false \
npm run web
```

## Useful Checks

```bash
node src/monitor.js --once --dry-run --url https://www.doc.lk/channel/31317
npm pack --dry-run
```

## Test Coverage

Current tests cover:

- Session parsing
- Open-session detection
- Empty Doc.lk page guard
- Doctor search result parsing
- Hospital list parsing
- URL normalization
- Subscription activation/deactivation

## Code Style

- Keep dependencies small.
- Keep parser changes covered by tests.
- Do not commit secrets, logs, `.env`, or `.state`.
- Keep polling intervals respectful.
