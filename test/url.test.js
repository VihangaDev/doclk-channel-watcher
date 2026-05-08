import assert from "node:assert/strict";
import test from "node:test";

import { getChannelId, normalizeChannelUrl } from "../src/url.js";

test("normalizes valid doc.lk channel URLs", () => {
  assert.equal(
    normalizeChannelUrl("https://www.doc.lk/channel/31317?#"),
    "https://www.doc.lk/channel/31317",
  );
  assert.equal(normalizeChannelUrl("doc.lk/channel/31317"), "https://www.doc.lk/channel/31317");
  assert.equal(getChannelId("https://doc.lk/channel/31317"), "31317");
});

test("rejects non-channel URLs", () => {
  assert.throws(() => normalizeChannelUrl("https://example.com/channel/31317"), /Only doc.lk/);
  assert.throws(() => normalizeChannelUrl("https://www.doc.lk/search"), /must look like/);
});
