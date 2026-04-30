import * as cheerio from "cheerio";

export const BLOCKED_STATUSES = new Set([
  "canceled",
  "cancelled",
  "session full",
  "contact hospital",
  "holiday",
  "disabled",
  "disable",
  "not available",
]);

export async function fetchChannelPage(url, { fetchImpl = fetch, timeoutMs = 20_000 } = {}) {
  const response = await fetchImpl(url, {
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "user-agent":
        "Mozilla/5.0 (compatible; DocLKChannelWatcher/1.0; +https://www.doc.lk/)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Doc.lk returned HTTP ${response.status}`);
  }

  return response.text();
}

export function parseChannelPage(html, pageUrl) {
  const $ = cheerio.load(html);
  const doctorName = cleanText($(".doctor-name").first().text());
  const doctorTitle = cleanText($(".doctor-title").first().text());
  const hospital = cleanText($(".ui-component-note").first().text());

  const sessions = [];
  $(".ui-component-sessions").each((index, element) => {
    const row = $(element);
    const button = row.find(".ui-component-options a.btn").first();
    const status = cleanText(row.find(".session-status").first().text()) || "Unknown";
    const date = cleanText(row.find(".session-date").first().text());
    const time = cleanText(row.find(".session-time").first().text());
    const activeAppointments = cleanText(row.find(".session-active-count").first().text());
    const href = normalizeHref(button.attr("href"), pageUrl);
    const buttonClass = button.attr("class") || "";
    const rowClass = row.attr("class") || "";
    const disabled = buttonClass.split(/\s+/).includes("disabled") || href === null;
    const open = isOpenSession({ disabled, status, href, rowClass });

    sessions.push({
      id: stableSessionId({ date, time, status, href, index }),
      index,
      date,
      time,
      status,
      activeAppointments,
      href,
      disabled,
      open,
      rowClass,
      buttonClass,
    });
  });

  return {
    doctorName,
    doctorTitle,
    hospital,
    pageUrl,
    checkedAt: new Date().toISOString(),
    sessions,
    openSessions: sessions.filter((session) => session.open),
  };
}

export function isOpenSession({ disabled, status, href, rowClass = "" }) {
  const normalizedStatus = status.toLowerCase();
  const blockedByStatus = BLOCKED_STATUSES.has(normalizedStatus);
  const blockedByClass = /\bui-component-(cancel|full|web-disable|holiday)\b/.test(rowClass);

  if (href && !disabled) {
    return true;
  }

  return !disabled && !blockedByStatus && !blockedByClass;
}

export function formatSession(session) {
  const appointmentText = session.activeAppointments
    ? `Active appointments: ${session.activeAppointments}`
    : "Active appointments: unknown";
  const linkText = session.href ? `\nBook: ${session.href}` : "";

  return [
    `${session.date || "Unknown date"} ${session.time || ""}`.trim(),
    `Status: ${session.status}`,
    appointmentText,
  ].join("\n") + linkText;
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeHref(href, pageUrl) {
  if (!href || href === "#") {
    return null;
  }

  try {
    return new URL(href, pageUrl).toString();
  } catch {
    return href;
  }
}

function stableSessionId({ date, time, status, href, index }) {
  return [date, time, href || status || "unknown", index].join("|").toLowerCase();
}
