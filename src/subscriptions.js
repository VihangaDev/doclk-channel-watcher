import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const DEFAULT_TTL_MS = 15 * 60 * 1000;

export async function readSubscriptionStore(path) {
  try {
    return normalizeStore(JSON.parse(await readFile(path, "utf8")));
  } catch (error) {
    if (error.code === "ENOENT") {
      return emptyStore();
    }
    throw error;
  }
}

export async function createPendingSubscription(path, url, { ttlMs = DEFAULT_TTL_MS } = {}) {
  const store = prunePending(await readSubscriptionStore(path));
  const now = new Date();
  const code = randomBytes(9).toString("base64url");

  store.pending[code] = {
    code,
    url,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
  };

  await writeSubscriptionStore(path, store);
  return store.pending[code];
}

export async function activatePendingSubscription(path, code, chat) {
  const store = prunePending(await readSubscriptionStore(path));
  const pending = store.pending[code];

  if (!pending) {
    throw new Error("Subscription link is invalid or expired");
  }

  const chatId = String(chat.id);
  const id = subscriptionId(chatId, pending.url);
  const subscription = {
    id,
    url: pending.url,
    chatId,
    username: chat.username || null,
    firstName: chat.first_name || chat.firstName || null,
    active: true,
    createdAt: store.subscriptions[id]?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.subscriptions[id] = subscription;
  delete store.pending[code];
  await writeSubscriptionStore(path, store);
  return subscription;
}

export async function deactivateChatSubscriptions(path, chatId) {
  const store = await readSubscriptionStore(path);
  let count = 0;

  for (const subscription of Object.values(store.subscriptions)) {
    if (String(subscription.chatId) === String(chatId) && subscription.active) {
      subscription.active = false;
      subscription.updatedAt = new Date().toISOString();
      count += 1;
    }
  }

  await writeSubscriptionStore(path, store);
  return count;
}

export async function listActiveSubscriptions(path) {
  const store = prunePending(await readSubscriptionStore(path));
  await writeSubscriptionStore(path, store);
  return Object.values(store.subscriptions).filter((subscription) => subscription.active);
}

export async function writeSubscriptionStore(path, store) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(normalizeStore(store), null, 2)}\n`, "utf8");
}

function emptyStore() {
  return { version: 1, pending: {}, subscriptions: {} };
}

function normalizeStore(store) {
  return {
    version: 1,
    pending: store?.pending && typeof store.pending === "object" ? store.pending : {},
    subscriptions:
      store?.subscriptions && typeof store.subscriptions === "object" ? store.subscriptions : {},
  };
}

function prunePending(store) {
  const now = Date.now();
  for (const [code, pending] of Object.entries(store.pending)) {
    if (!pending.expiresAt || new Date(pending.expiresAt).getTime() <= now) {
      delete store.pending[code];
    }
  }
  return store;
}

function subscriptionId(chatId, url) {
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 20);
  return `${chatId}:${hash}`;
}
