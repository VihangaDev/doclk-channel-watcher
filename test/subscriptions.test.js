import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import {
  activatePendingSubscription,
  createPendingSubscription,
  deactivateChatSubscriptions,
  listActiveSubscriptions,
} from "../src/subscriptions.js";

test("creates and activates a Telegram subscription", async () => {
  const dir = await mkdtemp(join(tmpdir(), "doclk-subscriptions-"));
  const path = join(dir, "subscriptions.json");

  try {
    const pending = await createPendingSubscription(path, "https://www.doc.lk/channel/31317");
    const subscription = await activatePendingSubscription(path, pending.code, {
      id: 123,
      username: "tester",
      first_name: "Test",
    });

    assert.equal(subscription.url, "https://www.doc.lk/channel/31317");
    assert.equal(subscription.chatId, "123");

    const active = await listActiveSubscriptions(path);
    assert.equal(active.length, 1);

    const stopped = await deactivateChatSubscriptions(path, 123);
    assert.equal(stopped, 1);
    assert.equal((await listActiveSubscriptions(path)).length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
