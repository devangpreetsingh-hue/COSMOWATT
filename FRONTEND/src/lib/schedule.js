import { sum, peakRun } from "./solar.js";
import { fmtClock, fmtDuration } from "./time.js";
import { typeInfo } from "./presets.js";

const clampInt = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(+v || 0)));
const fmtKw = (v) => (v >= 10 ? v.toFixed(0) : v.toFixed(1));

/**
 * Greedy solar-first scheduler for one day.
 * pv[h]      estimated generation (kW) for hour block h (0..23)
 * Spare solar after the safety margin and always-on load is what appliances compete for.
 * Appliances are placed by priority (1 = High), then by power draw. Each takes the start time
 * that covers the most of its energy from solar; ties go to the slot with the most headroom.
 */
export function planDay(appliances, pv, { baseLoadKw, margin }) {
  const spareBase = pv.map((p) => Math.max(0, p * (1 - margin) - baseLoadKw));
  const spare = spareBase.slice();
  const enabled = appliances.map((a, idx) => ({ a, idx })).filter((x) => x.a.enabled);
  const order = enabled.slice().sort((x, y) => x.a.priority - y.a.priority || y.a.kw - x.a.kw || x.idx - y.idx);
  const placed = new Map();

  for (const { a } of order) {
    const d = clampInt(a.hours, 1, 24), ws = clampInt(a.winStart, 0, 23), we = clampInt(a.winEnd, 1, 24);
    const entry = { ...a, icon: typeInfo(a.type).icon, hours: d, start: null, end: null, solarKwh: 0, gridKwh: a.kw * d, coverage: 0, status: "invalid", reason: "" };
    const candidates = [];
    if (a.mode === "fixed") { if (ws + d <= 24) candidates.push(ws); }
    else for (let s = ws; s + d <= we; s++) candidates.push(s);
    if (!candidates.length) {
      entry.reason = a.mode === "fixed"
        ? "The start time leaves too little room before midnight."
        : `It needs ${d} h but your preferred window is only ${Math.max(0, we - ws)} h. Widen the window or shorten the run.`;
      placed.set(a.id, entry);
      continue;
    }
    let best = null;
    for (const s of candidates) {
      let solar = 0, minLeft = Infinity;
      for (let h = s; h < s + d; h++) { solar += Math.min(a.kw, spare[h]); minLeft = Math.min(minLeft, spare[h] - a.kw); }
      if (!best || solar > best.solar + 1e-9 || (Math.abs(solar - best.solar) <= 1e-9 && minLeft > best.minLeft + 1e-9)) best = { s, solar, minLeft };
    }
    for (let h = best.s; h < best.s + d; h++) spare[h] -= Math.min(a.kw, spare[h]);
    const total = a.kw * d, coverage = total > 0 ? best.solar / total : 0;
    entry.start = best.s; entry.end = best.s + d; entry.solarKwh = best.solar; entry.gridKwh = total - best.solar; entry.coverage = coverage;
    entry.status = coverage >= 0.999 ? "solar" : coverage >= 0.05 ? "partial" : "grid";
    const win = `${fmtClock(entry.start)}–${fmtClock(entry.end)}`;
    if (entry.status === "solar") {
      const headroom = Math.max(0, best.minLeft);
      entry.reason = `Runs ${win} entirely on solar. Your panels have at least ${fmtKw(a.kw + headroom)} kW spare then and it needs ${fmtKw(a.kw)} kW.`;
    } else if (entry.status === "partial") {
      entry.reason = `Best slot in your preferred hours is ${win}, but solar covers only ${Math.round(coverage * 100)}% of it. Widen the window, add panels or turn something else off.`;
    } else {
      entry.reason = `Not enough spare solar in your preferred hours, so this will use grid power. Try a wider window or a larger panel size.`;
    }
    placed.set(a.id, entry);
  }
  const items = enabled.map((x) => placed.get(x.a.id));
  const consumption = Array.from({ length: 24 }, (_, h) =>
    items.reduce((s, it) => (it.start !== null && h >= it.start && h < it.end ? s + it.kw : s), baseLoadKw));
  return { items, spareBase, spareAfter: spare, consumption };
}

/** Free-power windows: runs of hours where spare solar can power the smallest appliance. */
export function findWindows(spareBase, minKw) {
  const runs = [];
  let s = null;
  for (let h = 0; h <= 24; h++) {
    const ok = h < 24 && spareBase[h] >= minKw;
    if (ok && s === null) s = h;
    if (!ok && s !== null) { runs.push({ start: s, end: h, energy: sum(spareBase.slice(s, h)) }); s = null; }
  }
  return runs;
}

/** The best (most spare energy) free-power window of the day, with plain-English reasoning. */
export function mainWindow(plan, pv, { baseLoadKw, margin }, appliances) {
  const mins = appliances.filter((a) => a.enabled).map((a) => a.kw);
  const minKw = mins.length ? Math.min(...mins) : 0.5;
  const runs = findWindows(plan.spareBase, minKw);
  if (!runs.length) return null;
  const w = runs.reduce((b, r) => (r.energy > b.energy ? r : b));
  const seg = pv.slice(w.start, w.end), spareSeg = plan.spareBase.slice(w.start, w.end);
  const run = plan.items.filter((it) => it.start !== null && it.status !== "grid" && it.start < w.end && it.end > w.start);
  const avg = sum(seg) / seg.length, peak = Math.max(...seg), minSpare = Math.min(...spareSeg);
  return {
    start: w.start, end: w.end, duration: w.end - w.start, avgPvKw: avg, peakPvKw: peak, minSpareKw: minSpare, spareKwh: w.energy,
    appliances: run,
    why: `Between ${fmtClock(w.start)} and ${fmtClock(w.end)} your panels are forecast to make about ${fmtKw(avg)} kW (peak ${fmtKw(peak)} kW). ` +
      `After your ${fmtKw(baseLoadKw)} kW always-on load and a ${Math.round(margin * 100)}% safety margin, at least ${fmtKw(minSpare)} kW stays spare for the whole ${fmtDuration(w.end - w.start)}, ` +
      `so appliances can run without grid power.`,
  };
}

/** Day-level energy numbers. All values are estimates derived from the plan. */
export function analyze({ pv, plan, appliances, baseLoadKw, tariff }) {
  const gen = sum(pv), cons = plan.consumption, consTotal = sum(cons);
  const used = pv.map((p, h) => Math.min(p, cons[h]));
  const usedTotal = sum(used);
  const surplus = sum(pv.map((p, h) => Math.max(0, p - cons[h])));
  // Baseline: every appliance simply starts at the beginning of its preferred window.
  const naiveCons = Array.from({ length: 24 }, () => baseLoadKw);
  for (const a of appliances.filter((x) => x.enabled)) {
    const d = clampInt(a.hours, 1, 24), s = clampInt(a.winStart, 0, 23);
    if (s + d <= 24) for (let h = s; h < s + d; h++) naiveCons[h] += a.kw;
  }
  const naiveUsed = sum(pv.map((p, h) => Math.min(p, naiveCons[h])));
  const peak = peakRun(pv);
  return {
    genKwh: gen, consKwh: consTotal, usedKwh: usedTotal, surplusKwh: surplus,
    gridKwh: Math.max(0, consTotal - usedTotal),
    utilization: gen > 0 ? usedTotal / gen : 0,
    selfSufficiency: consTotal > 0 ? usedTotal / consTotal : 0,
    savings: usedTotal * tariff,
    scheduleGainKwh: Math.max(0, usedTotal - naiveUsed),
    peak, used,
  };
}

/**
 * Countdown target using the location's own clock.
 * today / tomorrow are mainWindow() results (or null). t = local decimal hour now.
 */
export function countdownTarget(today, tomorrow, t) {
  if (today && t >= today.start && t < today.end) return { mode: "live", seconds: (today.end - t) * 3600, window: today, dayOffset: 0 };
  if (today && t < today.start) return { mode: "upcoming", seconds: (today.start - t) * 3600, window: today, dayOffset: 0 };
  if (tomorrow) return { mode: "upcoming", seconds: (tomorrow.start + 24 - t) * 3600, window: tomorrow, dayOffset: 1 };
  return { mode: "none", seconds: null, window: null, dayOffset: 0 };
}
