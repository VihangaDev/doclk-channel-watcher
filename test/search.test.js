import assert from "node:assert/strict";
import test from "node:test";

import { parseDoctorSearchPage, parseHospitals } from "../src/search.js";

test("parses hospitals from Doc.lk search select", () => {
  const html = `
    <select id="hospital-input">
      <option value="0">Any Hospital</option>
      <option value="32"> Park Hospitals (Pvt) Ltd - Colombo 05</option>
      <option value="185"> Aayu by Nawaloka Care PREMIER - Colombo 07</option>
    </select>
  `;

  assert.deepEqual(parseHospitals(html), [
    { id: "32", name: "Park Hospitals (Pvt) Ltd - Colombo 05" },
    { id: "185", name: "Aayu by Nawaloka Care PREMIER - Colombo 07" },
  ]);
});

test("parses doctor search results grouped by hospital", () => {
  const html = `
    <h3 class="ui-component-title"> Park Hospitals (Pvt) Ltd - Colombo 05 (1)</h3>
    <ul class="ui-component-list">
      <li>
        <div class="ui-component doctor_channel" data-link="//www.doc.lk/channel/3012?doctor=kapila">
          <div class="doctor-photo"><img src="https://www.doc.lk/img/photos/doctor-default.gif"></div>
          <div class="doctor-quick-details">
            <ul>
              <li class="doctor-name"><a href="#/">Dr. KAPILA RANASINGHE </a></li>
              <li class="doctor-title">Psychiatrist</li>
            </ul>
          </div>
          <div class="ui-component-options">
            <a href="//www.doc.lk/channel/3012?doctor=kapila">Channel</a>
          </div>
        </div>
      </li>
    </ul>
    <h3 class="ui-component-title"> Nawaloka Hospital - Colombo 02 (1)</h3>
    <ul class="ui-component-list">
      <li>
        <div class="ui-component doctor_channel" data-link="//www.doc.lk/channel/5210?doctor=kapila">
          <div class="doctor-quick-details">
            <ul>
              <li class="doctor-name"><a href="#/">Dr. KAPILA ABEYRATHNA </a></li>
              <li class="doctor-title">Physician</li>
            </ul>
          </div>
          <div class="ui-component-options">
            <a href="//www.doc.lk/channel/5210?doctor=kapila">Channel</a>
          </div>
        </div>
      </li>
    </ul>
  `;

  const search = parseDoctorSearchPage(html);

  assert.equal(search.total, 2);
  assert.deepEqual(
    search.hospitals.map((hospital) => `${hospital.name}:${hospital.count}`),
    ["Park Hospitals (Pvt) Ltd - Colombo 05:1", "Nawaloka Hospital - Colombo 02:1"],
  );
  assert.equal(search.results[0].name, "Dr. KAPILA RANASINGHE");
  assert.equal(search.results[0].channelUrl, "https://www.doc.lk/channel/3012?doctor=kapila");
});
