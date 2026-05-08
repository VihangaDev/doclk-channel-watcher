import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { runCheck } from "../src/monitor.js";

test("does not accept a page with no session rows", async () => {
  const dir = await mkdtemp(join(tmpdir(), "doclk-monitor-"));

  try {
    await assert.rejects(
      () =>
        runCheck({
          url: "https://www.doc.lk/channel/12345",
          stateFile: join(dir, "state.json"),
          fetchTimeoutMs: 1000,
          dryRun: true,
          telegramBotToken: "",
          telegramChatId: "",
          fetchImpl: async () => ({ ok: true, text: async () => "<html></html>" }),
        }),
      /No session rows found/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
