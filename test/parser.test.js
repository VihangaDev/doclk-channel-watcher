import assert from "node:assert/strict";
import test from "node:test";

import { parseChannelPage } from "../src/doclk.js";

test("parses closed and open sessions from doc.lk HTML", () => {
  const html = `
    <h3 class="ui-component-note"> Park Hospitals (Pvt) Ltd - Colombo 05</h3>
    <li class="doctor-name"><a href="#/">Dr. KAPILA RANASINGHE</a></li>
    <li class="doctor-title">Psychiatrist</li>
    <div class="ui-component ui-component-full ui-component-orange ui-component-sessions">
      <li class="session-date">May 11, 2026</li>
      <li class="session-time">Mon 04:30 pm</li>
      <li class="session-active-count">53</li>
      <div class="ui-component-options">
        <a href="#" class="btn btn-orange disabled">Book</a>
        <li class="session-status">Session Full</li>
      </div>
    </div>
    <div class="ui-component ui-component-success ui-component-sessions">
      <li class="session-date">May 12, 2026</li>
      <li class="session-time">Tue 02:00 pm</li>
      <li class="session-active-count">12</li>
      <div class="ui-component-options">
        <a href="/booking/123" class="btn btn-success">Book</a>
        <li class="session-status">Available</li>
      </div>
    </div>
  `;

  const report = parseChannelPage(html, "https://www.doc.lk/channel/12345");

  assert.equal(report.doctorName, "Dr. KAPILA RANASINGHE");
  assert.equal(report.hospital, "Park Hospitals (Pvt) Ltd - Colombo 05");
  assert.equal(report.sessions.length, 2);
  assert.equal(report.openSessions.length, 1);
  assert.equal(report.openSessions[0].date, "May 12, 2026");
  assert.equal(report.openSessions[0].href, "https://www.doc.lk/booking/123");
});

test("detects doc.lk primary channel rows as open", () => {
  const html = `
    <h3 class="ui-component-note"> Aayu by Nawaloka Care PREMIER - Colombo 07</h3>
    <li class="doctor-name"><a href="#/">Ms. A. MAJITHA</a></li>
    <li class="doctor-title">Physiotherapist</li>
    ${[15806070, 15814225, 15829182, 15844832]
      .map(
        (id, index) => `
          <div class="ui-component ui-component-primary ui-component-sessions ui-component-channel">
            <li class="session-date">${["April 29, 2026", "April 30, 2026", "May 02, 2026", "May 04, 2026"][index]}</li>
            <li class="session-time">${["Wed 11:00 am", "Thu 11:00 am", "Sat 11:00 am", "Mon 11:00 am"][index]}</li>
            <li class="session-active-count">00</li>
            <div class="ui-component-options">
              <a href="/book/${id}" class="btn btn-primary">Book</a>
              <li class="session-status">Available</li>
            </div>
          </div>
        `,
      )
      .join("")}
  `;

  const report = parseChannelPage(html, "https://www.doc.lk/channel/31317");

  assert.equal(report.sessions.length, 4);
  assert.equal(report.openSessions.length, 4);
  assert.deepEqual(
    report.openSessions.map((session) => session.href),
    [
      "https://www.doc.lk/book/15806070",
      "https://www.doc.lk/book/15814225",
      "https://www.doc.lk/book/15829182",
      "https://www.doc.lk/book/15844832",
    ],
  );
});
