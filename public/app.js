const form = document.querySelector("#watch-form");
const input = document.querySelector("#channel-url");
const searchForm = document.querySelector("#doctor-search-form");
const doctorQuery = document.querySelector("#doctor-query");
const suggestionsList = document.querySelector("#doctor-suggestions");
const hospitalFilter = document.querySelector("#hospital-filter");
const panel = document.querySelector("#status-panel");
const subscribeButton = document.querySelector("#subscribe-button");
const telegramLink = document.querySelector("#telegram-link");
const serviceState = document.querySelector("#service-state");
const subscriberCount = document.querySelector("#subscriber-count");
const channelCount = document.querySelector("#channel-count");

let lastUrl = "";
let searchResults = [];
let selectedHospital = "all";

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  lastUrl = input.value.trim();
  telegramLink.hidden = true;
  await checkChannel(lastUrl);
});

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await searchDoctors(doctorQuery.value.trim());
});

doctorQuery.addEventListener("input", debounce(async () => {
  const term = doctorQuery.value.trim();
  if (term.length < 3) {
    suggestionsList.innerHTML = "";
    return;
  }

  try {
    const response = await fetch(`/api/doctor-suggestions?doctor=${encodeURIComponent(term)}`);
    const payload = await response.json();
    if (!response.ok) {
      return;
    }
    suggestionsList.innerHTML = payload.suggestions
      .slice(0, 12)
      .map((suggestion) => `<option value="${escapeHtml(suggestion)}"></option>`)
      .join("");
  } catch {
    suggestionsList.innerHTML = "";
  }
}, 220));

subscribeButton.addEventListener("click", async () => {
  const url = input.value.trim() || lastUrl;
  if (!url) {
    renderError("Enter a Doc.lk channel URL first.");
    return;
  }

  subscribeButton.disabled = true;
  subscribeButton.textContent = "Creating link";

  try {
    const response = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Unable to create Telegram link");
    }

    telegramLink.href = payload.telegramUrl;
    telegramLink.hidden = false;
    telegramLink.focus();
  } catch (error) {
    renderError(error.message);
  } finally {
    subscribeButton.disabled = false;
    subscribeButton.textContent = "Telegram alerts";
  }
});

async function checkChannel(url) {
  panel.innerHTML = `<div class="empty-state"><strong>Checking Doc.lk now</strong><span>${escapeHtml(url)}</span></div>`;

  try {
    const response = await fetch(`/api/check?url=${encodeURIComponent(url)}`);
    const report = await response.json();
    if (!response.ok) {
      throw new Error(report.error || "Unable to check channel");
    }
    renderReport(report);
  } catch (error) {
    renderError(error.message);
  }
}

async function searchDoctors(doctor) {
  if (doctor.length < 2) {
    renderError("Enter at least 2 characters to search doctors.");
    return;
  }

  telegramLink.hidden = true;
  hospitalFilter.hidden = true;
  panel.innerHTML = `<div class="empty-state"><strong>Searching Doc.lk</strong><span>${escapeHtml(doctor)}</span></div>`;

  try {
    const response = await fetch(`/api/search-doctors?doctor=${encodeURIComponent(doctor)}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Unable to search doctors");
    }

    searchResults = payload.results || [];
    selectedHospital = "all";
    renderHospitalFilter(payload.hospitals || []);
    renderSearchResults(searchResults);
  } catch (error) {
    renderError(error.message);
  }
}

async function refreshHealth() {
  try {
    const response = await fetch("/api/health");
    const payload = await response.json();
    serviceState.textContent = payload.ok ? "Online" : "Issue";
    subscriberCount.textContent = String(payload.activeSubscriptions ?? 0);
    channelCount.textContent = String(payload.uniqueChannels ?? 0);
  } catch {
    serviceState.textContent = "Offline";
  }
}

function renderReport(report) {
  const sessions = [...report.sessions].sort((left, right) => Number(right.open) - Number(left.open));
  panel.innerHTML = "";

  const summary = document.createElement("div");
  summary.className = "summary";
  summary.innerHTML = `
    <h2>${escapeHtml(report.doctorName || "Doctor")}</h2>
    <p>${escapeHtml([report.doctorTitle, report.hospital].filter(Boolean).join(" · "))}</p>
    <p>${report.openCount}/${report.totalSessions} sessions open</p>
  `;
  panel.append(summary);

  const list = document.createElement("div");
  list.className = "session-list";
  for (const session of sessions) {
    const item = document.createElement(session.href && session.open ? "a" : "div");
    item.className = `session ${session.open ? "open" : "blocked"}`;
    if (session.href && session.open) {
      item.href = session.href;
      item.target = "_blank";
      item.rel = "noreferrer";
    }

    item.innerHTML = `
      <div>
        <strong>${escapeHtml(`${session.date || "Unknown date"} ${session.time || ""}`.trim())}</strong>
        <span>${escapeHtml(session.activeAppointments ? `Active appointments: ${session.activeAppointments}` : "Active appointments: unknown")}</span>
      </div>
      <span class="badge">${escapeHtml(session.status || "Unknown")}</span>
    `;
    list.append(item);
  }
  panel.append(list);
}

function renderHospitalFilter(hospitals) {
  hospitalFilter.innerHTML = "";
  hospitalFilter.hidden = false;

  const allButton = createHospitalButton("all", `All (${searchResults.length})`);
  hospitalFilter.append(allButton);

  for (const hospital of hospitals) {
    hospitalFilter.append(createHospitalButton(hospital.name, `${hospital.name} (${hospital.count})`));
  }
}

function createHospitalButton(value, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = value === selectedHospital ? "filter-chip active" : "filter-chip";
  button.textContent = label;
  button.addEventListener("click", () => {
    selectedHospital = value;
    renderHospitalFilter(getHospitalsFromResults(searchResults));
    renderSearchResults(searchResults);
  });
  return button;
}

function renderSearchResults(results) {
  const visibleResults =
    selectedHospital === "all"
      ? results
      : results.filter((result) => result.hospital === selectedHospital);

  panel.innerHTML = "";

  const summary = document.createElement("div");
  summary.className = "summary";
  summary.innerHTML = `
    <h2>${visibleResults.length} doctor channel${visibleResults.length === 1 ? "" : "s"}</h2>
    <p>${selectedHospital === "all" ? "All hospitals" : escapeHtml(selectedHospital)}</p>
  `;
  panel.append(summary);

  if (visibleResults.length === 0) {
    panel.insertAdjacentHTML(
      "beforeend",
      `<div class="empty-state"><strong>No channels found.</strong><span>Try All hospitals or a broader doctor name.</span></div>`,
    );
    return;
  }

  const list = document.createElement("div");
  list.className = "doctor-result-list";

  for (const result of visibleResults) {
    const item = document.createElement("article");
    item.className = "doctor-result";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(result.name)}</strong>
        <span>${escapeHtml(result.title || "Doctor")}</span>
        <small>${escapeHtml(result.hospital)}</small>
      </div>
      <button type="button" data-channel-url="${escapeHtml(result.channelUrl)}">View sessions</button>
    `;
    item.querySelector("button").addEventListener("click", async () => {
      input.value = result.channelUrl;
      lastUrl = result.channelUrl;
      telegramLink.hidden = true;
      await checkChannel(result.channelUrl);
    });
    list.append(item);
  }

  panel.append(list);
}

function getHospitalsFromResults(results) {
  const counts = new Map();
  for (const result of results) {
    counts.set(result.hospital, (counts.get(result.hospital) || 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => ({ name, count }));
}

function renderError(message) {
  panel.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

refreshHealth();
setInterval(refreshHealth, 30000);
