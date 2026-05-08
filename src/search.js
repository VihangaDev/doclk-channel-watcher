import * as cheerio from "cheerio";

const SEARCH_URL = "https://www.doc.lk/search";
const SUGGESTIONS_URL = "https://www.doc.lk/doctors/suggestions";

export async function fetchDoctorSearch({
  doctor,
  hospital = "0",
  specialization = "0",
  date = "",
  fetchImpl = fetch,
  timeoutMs = 20_000,
}) {
  const query = new URL(SEARCH_URL);
  query.searchParams.set("doctor", String(doctor || "").trim());
  query.searchParams.set("hospital", String(hospital || "0"));
  query.searchParams.set("specialization", String(specialization || "0"));
  query.searchParams.set("date", String(date || ""));

  const response = await fetchImpl(query, {
    headers: commonHeaders(),
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Doc.lk search returned HTTP ${response.status}`);
  }

  return response.text();
}

export async function fetchDoctorSuggestions({ doctor, fetchImpl = fetch, timeoutMs = 20_000 }) {
  const term = String(doctor || "").trim();
  if (term.length < 3) {
    return [];
  }

  const response = await fetchImpl(SUGGESTIONS_URL, {
    method: "POST",
    headers: {
      ...commonHeaders(),
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
    },
    body: new URLSearchParams({ doctor: term }),
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Doc.lk suggestions returned HTTP ${response.status}`);
  }

  const payload = await response.json();
  return (payload.suggestions || [])
    .map((item) => String(item.display || "").trim())
    .filter(Boolean);
}

export async function fetchHospitals({ fetchImpl = fetch, timeoutMs = 20_000 } = {}) {
  const html = await fetchDoctorSearch({ doctor: "", fetchImpl, timeoutMs });
  return parseHospitals(html);
}

export function parseHospitals(html) {
  const $ = cheerio.load(html);
  const hospitals = [];

  $("#hospital-input option").each((_index, element) => {
    const value = String($(element).attr("value") || "").trim();
    const name = cleanText($(element).text());
    if (!value || value === "0" || !name || /^any hospital$/i.test(name)) {
      return;
    }

    hospitals.push({ id: value, name });
  });

  return uniqueBy(hospitals, (hospital) => hospital.id);
}

export function parseDoctorSearchPage(html, pageUrl = SEARCH_URL) {
  const $ = cheerio.load(html);
  const results = [];

  $(".doctor_channel").each((index, element) => {
    const row = $(element);
    const hospitalHeading = row.closest("ul").prevAll("h3.ui-component-title").first();
    const hospital = cleanHospitalName(hospitalHeading.text());
    const name = cleanText(row.find(".doctor-name").first().text());
    const title = row
      .find(".doctor-title")
      .map((_titleIndex, titleElement) => cleanText($(titleElement).text()))
      .get()
      .filter(Boolean)
      .join(", ");
    const channelUrl = normalizeDocHref(row.find(".ui-component-options a").first().attr("href") || row.attr("data-link"), pageUrl);
    const channelId = channelUrl ? new URL(channelUrl).pathname.split("/").pop() : "";
    const image = normalizeDocHref(row.find(".doctor-photo img").first().attr("src"), pageUrl);

    if (!name || !channelUrl) {
      return;
    }

    results.push({
      id: channelId || `${name}-${hospital}-${index}`,
      channelId,
      name,
      title,
      hospital,
      channelUrl,
      image,
    });
  });

  const hospitals = uniqueBy(
    results.map((result) => ({ name: result.hospital, count: 0 })).filter((hospital) => hospital.name),
    (hospital) => hospital.name.toLowerCase(),
  ).map((hospital) => ({
    ...hospital,
    count: results.filter((result) => result.hospital === hospital.name).length,
  }));

  return {
    total: results.length,
    hospitals,
    results,
  };
}

function commonHeaders() {
  return {
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9",
    "cache-control": "no-cache",
    pragma: "no-cache",
    "user-agent": "Mozilla/5.0 (compatible; DocLKChannelWatcher/1.0; +https://www.doc.lk/)",
  };
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanHospitalName(value) {
  return cleanText(value).replace(/\(\d+\)$/, "").trim();
}

function normalizeDocHref(href, pageUrl) {
  if (!href) {
    return null;
  }

  try {
    return new URL(href, pageUrl).toString();
  } catch {
    return href;
  }
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }

  return result;
}
