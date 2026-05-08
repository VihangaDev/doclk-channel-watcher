import { formatSession } from "./doclk.js";

export function buildOpenMessage(report, sessions) {
  const doctor = [report.doctorName, report.doctorTitle].filter(Boolean).join(" - ");
  const heading = [
    "Doctor appointment opened",
    doctor || null,
    report.hospital || null,
  ].filter(Boolean).join("\n");

  return `${heading}\n\n${sessions.map(formatSession).join("\n\n")}\n\nPage: ${report.pageUrl}`;
}

export function buildSubscriptionActiveMessage(subscription) {
  return [
    "Subscription active.",
    `Watching: ${subscription.url}`,
    "You will receive a message when a new bookable session appears.",
    "",
    "Send /stop to remove your subscriptions.",
  ].join("\n");
}
