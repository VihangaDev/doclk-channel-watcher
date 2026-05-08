#!/usr/bin/env node
import "dotenv/config";

import express from "express";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { fetchChannelPage, parseChannelPage } from "./doclk.js";
import { buildOpenMessage, buildSubscriptionActiveMessage } from "./messages.js";
import { readState, writeState } from "./state.js";
import {
  activatePendingSubscription,
  createPendingSubscription,
  deactivateChatSubscriptions,
  listActiveSubscriptions,
} from "./subscriptions.js";
import { getTelegramBot, getTelegramUpdates, sendTelegramMessage } from "./telegram.js";
import { normalizeChannelUrl } from "./url.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");

function loadConfig(env = process.env) {
  const intervalSeconds = Number.parseInt(env.CHECK_INTERVAL_SECONDS || "60", 10);
  const fetchTimeoutSeconds = Number.parseInt(env.FETCH_TIMEOUT_SECONDS || "20", 10);

  return {
    port: Number.parseInt(env.PORT || "3000", 10),
    publicBaseUrl: env.PUBLIC_BASE_URL || "",
    subscriptionFile: env.SUBSCRIPTION_FILE || ".state/subscriptions.json",
    monitorStateFile: env.COMMUNITY_STATE_FILE || ".state/community-monitor-state.json",
    checkIntervalMs: Math.max(Number.isFinite(intervalSeconds) ? intervalSeconds : 60, 15) * 1000,
    fetchTimeoutMs:
      Math.max(Number.isFinite(fetchTimeoutSeconds) ? fetchTimeoutSeconds : 20, 5) * 1000,
    telegramBotToken: env.TELEGRAM_BOT_TOKEN || "",
    telegramBotUsername: env.TELEGRAM_BOT_USERNAME || "",
  };
}

export function createApp(config) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));
  app.use(rateLimit());
  app.use(express.static(PUBLIC_DIR));

  app.get("/api/health", async (_request, response) => {
    const subscriptions = await listActiveSubscriptions(config.subscriptionFile);
    response.json({
      ok: true,
      activeSubscriptions: subscriptions.length,
      uniqueChannels: new Set(subscriptions.map((subscription) => subscription.url)).size,
    });
  });

  app.get("/api/check", async (request, response) => {
    try {
      const url = normalizeChannelUrl(request.query.url);
      const report = await fetchReport(url, config);
      response.json(toPublicReport(report));
    } catch (error) {
      response.status(400).json({ error: error.message });
    }
  });

  app.post("/api/subscriptions", async (request, response) => {
    try {
      if (!config.telegramBotToken) {
        response.status(503).json({ error: "Telegram bot is not configured on this server" });
        return;
      }

      const url = normalizeChannelUrl(request.body?.url);
      const pending = await createPendingSubscription(config.subscriptionFile, url);
      const username = await resolveBotUsername(config);

      response.json({
        url,
        code: pending.code,
        expiresAt: pending.expiresAt,
        telegramUrl: `https://t.me/${username}?start=${pending.code}`,
      });
    } catch (error) {
      response.status(400).json({ error: error.message });
    }
  });

  return app;
}

async function main() {
  const config = loadConfig();
  const app = createApp(config);

  app.listen(config.port, () => {
    console.log(`Doc.lk Channel Watcher website listening on http://localhost:${config.port}`);
  });

  void pollTelegram(config);
  void monitorSubscriptions(config);
}

async function fetchReport(url, config) {
  const html = await fetchChannelPage(url, { timeoutMs: config.fetchTimeoutMs });
  return parseChannelPage(html, url);
}

async function pollTelegram(config) {
  if (!config.telegramBotToken) {
    console.warn("Telegram bot token missing. Subscription activation is disabled.");
    return;
  }

  let offset = 0;
  while (true) {
    try {
      const updates = await getTelegramUpdates({
        botToken: config.telegramBotToken,
        offset,
        timeoutSeconds: 25,
      });

      for (const update of updates) {
        offset = Math.max(offset, update.update_id + 1);
        await handleTelegramUpdate(config, update).catch((error) => {
          console.error(`Telegram update failed: ${error.stack || error.message}`);
        });
      }
    } catch (error) {
      console.error(`Telegram polling failed: ${error.message}`);
      await sleep(5000);
    }
  }
}

async function handleTelegramUpdate(config, update) {
  const message = update.message;
  const text = message?.text?.trim() || "";
  const chat = message?.chat;
  if (!chat || !text) {
    return;
  }

  const startMatch = text.match(/^\/start(?:\s+([A-Za-z0-9_-]+))?/);
  if (startMatch) {
    const code = startMatch[1];
    if (!code) {
      await sendTelegramMessage({
        botToken: config.telegramBotToken,
        chatId: chat.id,
        text: "Open the watcher website and choose Telegram alerts for a Doc.lk channel.",
      });
      return;
    }

    const subscription = await activatePendingSubscription(config.subscriptionFile, code, chat);
    await sendTelegramMessage({
      botToken: config.telegramBotToken,
      chatId: chat.id,
      text: buildSubscriptionActiveMessage(subscription),
    });

    await sendCurrentAvailability(config, subscription, chat.id);
    return;
  }

  if (/^\/stop\b/.test(text)) {
    const count = await deactivateChatSubscriptions(config.subscriptionFile, chat.id);
    await sendTelegramMessage({
      botToken: config.telegramBotToken,
      chatId: chat.id,
      text: count > 0 ? `Stopped ${count} subscription(s).` : "No active subscriptions found.",
    });
    return;
  }

  if (/^\/help\b/.test(text)) {
    await sendTelegramMessage({
      botToken: config.telegramBotToken,
      chatId: chat.id,
      text: "Use the watcher website to subscribe to a Doc.lk channel. Send /stop to remove your subscriptions.",
    });
  }
}

async function sendCurrentAvailability(config, subscription, chatId) {
  try {
    const report = await fetchReport(subscription.url, config);
    if (report.openSessions.length === 0) {
      return;
    }

    await sendTelegramMessage({
      botToken: config.telegramBotToken,
      chatId,
      text: buildOpenMessage(report, report.openSessions),
    });
  } catch (error) {
    console.error(`Current availability check failed: ${error.message}`);
  }
}

async function monitorSubscriptions(config) {
  while (true) {
    try {
      await runCommunityCheck(config);
    } catch (error) {
      console.error(`Subscription monitor failed: ${error.stack || error.message}`);
    }
    await sleep(config.checkIntervalMs);
  }
}

export async function runCommunityCheck(config) {
  const subscriptions = await listActiveSubscriptions(config.subscriptionFile);
  const subscriptionsByUrl = groupByUrl(subscriptions);
  const state = normalizeMonitorState(await readState(config.monitorStateFile));
  const nextState = {
    version: 2,
    lastCheckedAt: new Date().toISOString(),
    channels: { ...state.channels },
  };

  for (const [url, channelSubscriptions] of subscriptionsByUrl.entries()) {
    const report = await fetchReport(url, config);
    const previousOpenIds = new Set(state.channels[url]?.openSessionIds || []);
    const newlyOpenSessions = report.openSessions.filter((session) => !previousOpenIds.has(session.id));

    console.log(
      `[${new Date(report.checkedAt).toLocaleString()}] ${report.doctorName || url}: ${report.openSessions.length}/${report.sessions.length} open; ${channelSubscriptions.length} subscriber(s)`,
    );

    if (newlyOpenSessions.length > 0) {
      const text = buildOpenMessage(report, newlyOpenSessions);
      for (const subscription of channelSubscriptions) {
        await sendTelegramMessage({
          botToken: config.telegramBotToken,
          chatId: subscription.chatId,
          text,
        }).catch((error) => {
          console.error(`Notify ${subscription.chatId} failed: ${error.message}`);
        });
      }
    }

    nextState.channels[url] = {
      openSessionIds: report.openSessions.map((session) => session.id),
      lastCheckedAt: report.checkedAt,
      totalSessions: report.sessions.length,
    };
  }

  await writeState(config.monitorStateFile, nextState);
}

async function resolveBotUsername(config) {
  if (config.telegramBotUsername) {
    return config.telegramBotUsername.replace(/^@/, "");
  }

  const bot = await getTelegramBot({ botToken: config.telegramBotToken });
  config.telegramBotUsername = bot.username;
  return bot.username;
}

function toPublicReport(report) {
  return {
    doctorName: report.doctorName,
    doctorTitle: report.doctorTitle,
    hospital: report.hospital,
    pageUrl: report.pageUrl,
    checkedAt: report.checkedAt,
    totalSessions: report.sessions.length,
    openCount: report.openSessions.length,
    sessions: report.sessions.map((session) => ({
      date: session.date,
      time: session.time,
      status: session.status,
      activeAppointments: session.activeAppointments,
      href: session.href,
      open: session.open,
    })),
  };
}

function normalizeMonitorState(state) {
  if (state?.channels && typeof state.channels === "object") {
    return state;
  }
  return { version: 2, lastCheckedAt: null, channels: {} };
}

function groupByUrl(subscriptions) {
  const groups = new Map();
  for (const subscription of subscriptions) {
    const group = groups.get(subscription.url) || [];
    group.push(subscription);
    groups.set(subscription.url, group);
  }
  return groups;
}

function rateLimit({ windowMs = 60_000, maxRequests = 40 } = {}) {
  const buckets = new Map();

  return (request, response, next) => {
    const key = request.ip || "unknown";
    const now = Date.now();
    const bucket = buckets.get(key)?.filter((timestamp) => now - timestamp < windowMs) || [];

    if (bucket.length >= maxRequests) {
      response.status(429).json({ error: "Too many requests. Please try again shortly." });
      return;
    }

    bucket.push(now);
    buckets.set(key, bucket);
    next();
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
