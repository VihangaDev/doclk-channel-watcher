# Contributing

Thanks for helping improve Doc.lk Channel Watcher.

## Development

```bash
npm install
npm test
node src/monitor.js --once --dry-run --url https://www.doc.lk/channel/31317
```

## Pull Requests

- Keep changes focused.
- Add tests for parser or notification behavior changes.
- Do not commit `.env`, logs, `.state`, or real Telegram credentials.
- Use a reasonable polling interval when testing against Doc.lk.

## Reporting Bugs

Include:

- The channel URL being monitored
- The session status shown on Doc.lk
- The watcher log output
- Whether the issue affects detection, Telegram delivery, or service runtime
