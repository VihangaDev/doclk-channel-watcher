# Architecture

The project has two runtime entry points.

## Personal Watcher

Entry point:

```text
src/monitor.js
```

Flow:

1. Read channel URLs from env or `--url`.
2. Fetch each Doc.lk channel page.
3. Parse session rows.
4. Compare current open sessions with previous state.
5. Send Telegram alerts for newly opened sessions.
6. Write updated state.

State file:

```text
.state/doclk-watcher-state.json
```

## Community Website

Entry point:

```text
src/community-service.js
```

Responsibilities:

- Serve the website from `public/`
- Search doctors through Doc.lk search pages
- Check channel availability
- Create pending Telegram subscription codes
- Poll Telegram for `/start <code>` and `/stop`
- Monitor subscribed channel URLs
- Notify every subscriber for a channel when a new session opens

Files:

```text
public/                 Website UI
src/search.js           Doctor search and hospital parsing
src/doclk.js            Channel page parsing
src/subscriptions.js    JSON subscription store
src/telegram.js         Telegram API client
src/state.js            State file helpers
src/messages.js         Alert message formatting
```

## Detection Logic

A session is open when:

- The row has a Book button
- The button is not disabled
- The button has a real booking URL

Blocked states include:

- `Session Full`
- `Canceled`
- `Cancelled`
- `Contact Hospital`
- `Holiday`
- disabled/web-disabled rows

If a Doc.lk page loads but contains no session rows, the check fails instead of treating it as zero sessions. This prevents temporary broken pages from clearing state and causing duplicate alerts.

## Search Logic

Doctor search uses Doc.lk's existing public search flow:

```text
GET /search?doctor=<name>&hospital=0&specialization=0&date=
POST /doctors/suggestions
```

Search results are parsed from `.doctor_channel` rows and grouped by their hospital heading.
