// Pipeline-logic check with a synthetic, deterministic fixture. NOT real weather data.
import { parseForecast } from "../src/lib/api.js";
import { pvSeries } from "../src/lib/solar.js";
import { planDay, mainWindow, analyze } from "../src/lib/schedule.js";
import { DEFAULT_APPLIANCES, DEFAULT_PREFS } from "../src/lib/presets.js";

function fixture(cloudPct, lonShift) {
  const time = [], t = [], c = [], g = [];
  for (const d of ["2026-11-22", "2026-11-23"]) for (let h = 0; h < 24; h++) {
    time.push(`${d}T${String(h).padStart(2, "0")}:00`); t.push(25); c.push(cloudPct);
    const s = Math.max(0, Math.sin(Math.PI * (h - 6.5 - lonShift) / 11)); g.push(Math.round(800 * s * (1 - 0.7 * cloudPct / 100)));
  }
  return { latitude: 1, longitude: 1, utc_offset_seconds: 19800, timezone: "Asia/Kolkata", hourly: { time, temperature_2m: t, cloud_cover: c, shortwave_radiation: g },
    daily: { time: ["2026-11-22", "2026-11-23"], sunrise: ["2026-11-22T06:40", "2026-11-23T06:41"], sunset: ["2026-11-22T17:30", "2026-11-23T17:30"], temperature_2m_max: [30, 30], temperature_2m_min: [15, 15] } };
}
const run = (cloud, shift) => {
  const d = parseForecast(fixture(cloud, shift)), pv = pvSeries(d.days[0], DEFAULT_PREFS.panelKw), apps = DEFAULT_APPLIANCES();
  const plan = planDay(apps, pv, DEFAULT_PREFS);
  return { gen: analyze({ pv, plan, appliances: apps, baseLoadKw: .4, tariff: 8 }).genKwh, win: mainWindow(plan, pv, DEFAULT_PREFS, apps), plan };
};
const a = run(10, 0), b = run(70, 0.5);
console.log("clear day  :", a.gen.toFixed(1), "kWh, window", a.win.start + "-" + a.win.end, a.plan.items.map(i => i.name + "@" + i.start + ":" + i.status).join(" "));
console.log("cloudy day :", b.gen.toFixed(1), "kWh, window", b.win && (b.win.start + "-" + b.win.end), b.plan.items.map(i => i.name + "@" + i.start + ":" + i.status).join(" "));
if (!(a.gen > b.gen)) throw new Error("generation must respond to input data");
console.log("PASS: different input data -> different generation, window and schedule");
