export function normalizeChannelUrl(input) {
  const rawValue = String(input || "").trim();
  if (!rawValue) {
    throw new Error("Doc.lk channel URL is required");
  }

  const withProtocol = /^[a-z]+:\/\//i.test(rawValue) ? rawValue : `https://${rawValue}`;
  const url = new URL(withProtocol);
  const host = url.hostname.toLowerCase();

  if (host !== "doc.lk" && host !== "www.doc.lk") {
    throw new Error("Only doc.lk channel URLs are supported");
  }

  const match = url.pathname.match(/^\/channel\/(\d+)\/?$/);
  if (!match) {
    throw new Error("URL must look like https://www.doc.lk/channel/12345");
  }

  return `https://www.doc.lk/channel/${match[1]}`;
}

export function getChannelId(input) {
  return new URL(normalizeChannelUrl(input)).pathname.split("/").pop();
}
