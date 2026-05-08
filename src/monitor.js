#!/usr/bin/env node
import "dotenv/config";

import { setTimeout as sleep } from "node:timers/promises";
import { pathToFileURL } from "node:url";

import { fetchChannelPage, parseChannelPage } from "./doclk.js";
import { buildOpenMessage } from "./messages.js";
import { readState, writeState } from "./state.js";
import { sendTelegramMessage } from "./telegram.js";

function loadConfig(argv = process.argv.slice(2), env = process.env) {
  const args = parseArgs(argv);
  const intervalSeconds = Number.parseInt(env.CHECK_INTERVAL_SECONDS || "60", 10);
  const fetchTimeoutSeconds = Number.parseInt(env.FETCH_TIMEOUT_SECONDS || "20", 10);
  const errorNotifyAfter = Number.parseInt(env.ERROR_NOTIFY_AFTER || "3", 10);
  const urls = args.urls.length > 0 ? args.urls : parseUrlList(env.DOCLK_URLS || env.DOCLK_URL || "");

  return {
    urls,
    intervalMs: Math.max(Number.isFinite(intervalSeconds) ? intervalSeconds : 60, 15) * 1000,
    fetchTimeoutMs:
      Math.max(Number.isFinite(fetchTimeoutSeconds) ? fetchTimeoutSeconds : 20, 5) * 1000,
    errorNotifyAfter: Math.max(Number.isFinite(errorNotifyAfter) ? errorNotifyAfter : 3, 1),
    stateFile: env.STATE_FILE || ".state/doclk-watcher-state.json",
    telegramBotToken: env.TELEGRAM_BOT_TOKEN,
    telegramChatId: env.TELEGRAM_CHAT_ID,
    notifyOnStart: /^true$/i.test(env.NOTIFY_ON_START || ""),
    once: args.once,
    dryRun: args.dryRun,
  };
}

async function main() {
  const config = loadConfig();
  let consecutiveErrors = 0;

  if (config.urls.length === 0) {
    throw new Error("Set DOCLK_URLS in .env or pass at least one --url https://www.doc.lk/channel/...");
  }

  if (!config.telegramBotToken || !config.telegramChatId) {
    console.warn("Telegram credentials are not configured. Alerts will be printed only.");
  }

  if (config.notifyOnStart && !config.dryRun) {
    await notify(config, `Doc.lk channel watcher started.\nWatching:\n${config.urls.join("\n")}`).catch((error) => {
      console.error(`Startup notification failed: ${error.message}`);
    });
  }

  do {
    try {
      await runChecks(config);
      consecutiveErrors = 0;
    } catch (error) {
      consecutiveErrors += 1;
      console.error(`[${new Date().toISOString()}] Check failed: ${error.stack || error.message}`);

      if (config.once) {
        throw error;
      }

      if (consecutiveErrors === config.errorNotifyAfter) {
        await notify(
          config,
          `Doc.lk channel watcher has failed ${consecutiveErrors} checks in a row.\n\n${error.message}`,
        ).catch((notifyError) => {
          console.error(`Error notification failed: ${notifyError.message}`);
        });
      }
    }

    if (config.once) {
      break;
    }

    await sleep(config.intervalMs);
  } while (true);
}

export async function runCheck(config) {
  const url = config.url || config.urls?.[0];
  if (!url) {
    throw new Error("No Doc.lk URL configured");
  }

  const reports = await runChecks({ ...config, urls: [url] });
  return reports[0];
}

export async function runChecks(config) {
  const previousState = normalizeState(await readState(config.stateFile), config.urls);
  const nextState = {
    version: 2,
    lastCheckedAt: new Date().toISOString(),
    channels: { ...previousState.channels },
  };
  const reports = [];

  for (const url of config.urls) {
    const channelState = previousState.channels[url] || {};
    const report = await checkUrl(config, url, channelState);
    reports.push(report);

    if (!config.dryRun) {
      nextState.channels[url] = buildChannelState(report);
    }
  }

  if (!config.dryRun) {
    await writeState(config.stateFile, nextState);
  }

  return reports;
}

async function checkUrl(config, url, channelState) {
  const html = await fetchChannelPage(url, {
    fetchImpl: config.fetchImpl || fetch,
    timeoutMs: config.fetchTimeoutMs,
  });
  const report = parseChannelPage(html, url);
  if (report.sessions.length === 0) {
    throw new Error(`No session rows found for ${url}`);
  }

  const previousOpenIds = new Set(channelState.openSessionIds || []);
  const newlyOpenSessions = report.openSessions.filter((session) => !previousOpenIds.has(session.id));

  logReport(report, newlyOpenSessions);

  if (newlyOpenSessions.length > 0) {
    const message = buildOpenMessage(report, newlyOpenSessions);
    await notify(config, message);
  }

  return report;
}

async function notify(config, text) {
  if (config.dryRun || !config.telegramBotToken || !config.telegramChatId) {
    console.log(`\n--- Notification preview ---\n${text}\n--- End notification ---\n`);
    return;
  }

  await sendTelegramMessage({
    botToken: config.telegramBotToken,
    chatId: config.telegramChatId,
    text,
  });
}

function logReport(report, newlyOpenSessions) {
  const checkedAt = new Date(report.checkedAt).toLocaleString();
  console.log(
    `[${checkedAt}] ${report.doctorName || "Doctor"}: ${report.openSessions.length}/${report.sessions.length} open`,
  );

  if (newlyOpenSessions.length > 0) {
    for (const session of newlyOpenSessions) {
      console.log(`NEW OPEN: ${session.date} ${session.time} - ${session.status}`);
    }
  }
}

function buildChannelState(report) {
  return {
    openSessionIds: report.openSessions.map((session) => session.id),
    lastCheckedAt: report.checkedAt,
    totalSessions: report.sessions.length,
    openSessions: report.openSessions.map((session) => ({
      id: session.id,
      date: session.date,
      time: session.time,
      status: session.status,
      href: session.href,
    })),
  };
}

function normalizeState(state, urls) {
  if (state?.channels && typeof state.channels === "object") {
    return state;
  }

  if (Array.isArray(state?.openSessionIds)) {
    return {
      version: 2,
      lastCheckedAt: state.lastCheckedAt || null,
      channels: {
        [urls[0] || "default"]: state,
      },
    };
  }

  return { version: 2, lastCheckedAt: null, channels: {} };
}

function parseUrlList(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((url) => url.trim())
    .filter(Boolean);
}

function parseArgs(argv) {
  const result = {
    dryRun: false,
    once: false,
    urls: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      result.dryRun = true;
      continue;
    }

    if (arg === "--once") {
      result.once = true;
      continue;
    }

    if (arg === "--url") {
      const url = argv[index + 1];
      if (!url) {
        throw new Error("--url requires a value");
      }
      result.urls.push(url);
      index += 1;
      continue;
    }

    if (arg.startsWith("--url=")) {
      result.urls.push(arg.slice("--url=".length));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
