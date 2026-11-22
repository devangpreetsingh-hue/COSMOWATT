import React, { useEffect, useRef, useState } from "react";
import { fmtClock, fmtHourShort } from "../lib/time.js";

export function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(Math.max(280, Math.floor(el.clientWidth || 640)));
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

const niceMax = (v) => {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
};
const M = { l: 48, r: 16, t: 14, b: 30 };

function Axis({ x, y, w, h, lo, hi, yMax, yFmt, sunrise, sunset, rightLabel }) {
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const step = hi - lo > 14 ? 2 : 1;
  const hours = [];
  for (let k = lo; k <= hi; k += step) hours.push(k);
  return (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={M.l} x2={w - M.r} y1={y(t * yMax)} y2={y(t * yMax)} className="grid" />
          <text x={M.l - 8} y={y(t * yMax) + 4} textAnchor="end" className="ax">{yFmt(t * yMax)}</text>
          {rightLabel ? <text x={w - M.r + 0} y={y(t * yMax) + 4} textAnchor="end" className="ax ax-r" /> : null}
        </g>
      ))}
      {hours.map((k) => <text key={k} x={x(k)} y={h - 8} textAnchor="middle" className="ax">{fmtHourShort(k)}</text>)}
      {[sunrise, sunset].map((s, i) => s == null ? null : (
        <g key={i}>
          <line x1={x(s)} x2={x(s)} y1={M.t} y2={h - M.b} className="sunline" />
          <text x={x(s) + (i ? -4 : 4)} y={M.t + 10} textAnchor={i ? "end" : "start"} className="ax sun">{i ? "Sunset" : "Sunrise"} {fmtClock(s)}</text>
        </g>
      ))}
    </g>
  );
}

function useHover(width, lo, hi) {
  const [hover, setHover] = useState(null);
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const hr = Math.floor(lo + ((px - M.l) / (width - M.l - M.r)) * (hi - lo));
    setHover(hr >= lo && hr < hi ? hr : null);
  };
  return [hover, onMove, () => setHover(null)];
}

/** Sunlight reaching the ground (API data) and cloud cover (API data). */
export function IrradianceChart({ day, range, nowHour }) {
  const [ref, w] = useWidth();
  const [lo, hi] = range, H = 250;
  const [hover, onMove, onLeave] = useHover(w, lo, hi);
  const x = (h) => M.l + ((h - lo) / (hi - lo)) * (w - M.l - M.r);
  const maxG = niceMax(Math.max(...day.hours.map((d) => d.ghi), 100));
  const y = (v) => H - M.b - (v / maxG) * (H - M.t - M.b);
  const yc = (c) => H - M.b - (c / 100) * (H - M.t - M.b);
  const pts = day.hours.filter((d) => d.h >= lo && d.h < hi);
  const area = pts.length ? `M${x(pts[0].h)},${y(0)} ` + pts.map((d) => `L${x(d.h + 0.5)},${y(d.ghi)}`).join(" ") + ` L${x(pts[pts.length - 1].h + 1)},${y(0)} Z` : "";
  const cloud = pts.map((d, i) => `${i ? "L" : "M"}${x(d.h + 0.5)},${yc(d.cloud)}`).join(" ");
  const hv = hover != null ? day.hours[hover] : null;
  return (
    <div className="chart" ref={ref}>
      <svg width={w} height={H} role="img" aria-label="Solar irradiance and cloud cover by hour" onPointerMove={onMove} onPointerLeave={onLeave}>
        <defs><linearGradient id="gIrr" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--yellow)" stopOpacity=".55" /><stop offset="1" stopColor="var(--yellow)" stopOpacity=".04" /></linearGradient></defs>
        <Axis x={x} y={y} w={w} h={H} lo={lo} hi={hi} yMax={maxG} yFmt={(v) => Math.round(v)} sunrise={day.sunrise} sunset={day.sunset} />
        <path d={area} fill="url(#gIrr)" stroke="var(--yellow)" strokeWidth="2" strokeLinejoin="round" />
        <path d={cloud} fill="none" stroke="var(--blue)" strokeWidth="2" strokeDasharray="5 4" />
        {nowHour != null && nowHour >= lo && nowHour <= hi ? <line x1={x(nowHour)} x2={x(nowHour)} y1={M.t} y2={H - M.b} className="nowline" /> : null}
        {hv ? <rect x={x(hover)} y={M.t} width={(w - M.l - M.r) / (hi - lo)} height={H - M.t - M.b} className="hoverband" /> : null}
      </svg>
      <div className="legend"><span><i style={{ background: "var(--yellow)" }} />Sunlight, W/m²</span><span><i className="dash" />Cloud cover, % (0–100 on same grid)</span></div>
      {hv ? <div className="tt" style={{ left: Math.min(w - 170, Math.max(8, x(hover) - 70)) }}><b>{fmtClock(hover)}–{fmtClock(hover + 1)}</b><span>Sunlight {Math.round(hv.ghi)} W/m²</span><span>Cloud cover {Math.round(hv.cloud)}%</span><span>Temperature {hv.temp.toFixed(1)}°C</span></div> : null}
    </div>
  );
}

/** Estimated solar output vs your estimated consumption. */
export function GenerationChart({ day, pv, cons, range, nowHour }) {
  const [ref, w] = useWidth();
  const [lo, hi] = range, H = 270;
  const [hover, onMove, onLeave] = useHover(w, lo, hi);
  const x = (h) => M.l + ((h - lo) / (hi - lo)) * (w - M.l - M.r);
  const maxV = niceMax(Math.max(...pv, ...cons, 0.5) * 1.05);
  const y = (v) => H - M.b - (v / maxV) * (H - M.t - M.b);
  const bw = (w - M.l - M.r) / (hi - lo);
  let step = "";
  for (let h = lo; h < hi; h++) step += `${h === lo ? "M" : "L"}${x(h)},${y(cons[h])} L${x(h + 1)},${y(cons[h])} `;
  return (
    <div className="chart" ref={ref}>
      <svg width={w} height={H} role="img" aria-label="Estimated solar generation versus consumption by hour" onPointerMove={onMove} onPointerLeave={onLeave}>
        <defs><linearGradient id="gPv" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--cyan)" stopOpacity=".95" /><stop offset="1" stopColor="var(--blue)" stopOpacity=".55" /></linearGradient></defs>
        <Axis x={x} y={y} w={w} h={H} lo={lo} hi={hi} yMax={maxV} yFmt={(v) => v.toFixed(v < 10 ? 1 : 0)} sunrise={day.sunrise} sunset={day.sunset} />
        {pv.map((v, h) => h >= lo && h < hi ? <rect key={h} x={x(h) + 2} y={y(v)} width={Math.max(2, bw - 4)} height={Math.max(0, y(0) - y(v))} rx="4" fill="url(#gPv)" opacity={hover === h ? 1 : 0.9} /> : null)}
        <path d={step} fill="none" stroke="var(--yellow)" strokeWidth="2.5" strokeLinejoin="round" />
        {nowHour != null && nowHour >= lo && nowHour <= hi ? <line x1={x(nowHour)} x2={x(nowHour)} y1={M.t} y2={H - M.b} className="nowline" /> : null}
      </svg>
      <div className="legend"><span><i style={{ background: "var(--cyan)" }} />Estimated solar output, kW</span><span><i style={{ background: "var(--yellow)" }} />Your consumption with the schedule, kW</span>{nowHour != null ? <span><i className="dash now" />Now</span> : null}</div>
      {hover != null ? <div className="tt" style={{ left: Math.min(w - 190, Math.max(8, x(hover) - 80)) }}><b>{fmtClock(hover)}–{fmtClock(hover + 1)}</b><span>Solar output {pv[hover].toFixed(2)} kW</span><span>Consumption {cons[hover].toFixed(2)} kW</span><span>{pv[hover] >= cons[hover] ? `Surplus ${(pv[hover] - cons[hover]).toFixed(2)} kW` : `Grid needed ${(cons[hover] - pv[hover]).toFixed(2)} kW`}</span></div> : null}
    </div>
  );
}

const COLORS = { solar: "var(--green)", partial: "var(--yellow)", grid: "var(--red)", invalid: "var(--mut)" };

/** One row per appliance: preferred window (faint) and the recommended run (solid). */
export function ScheduleChart({ items, day, range, nowHour }) {
  const [ref, w] = useWidth();
  const starts = items.filter((i) => i.start !== null).map((i) => i.start), ends = items.filter((i) => i.end !== null).map((i) => i.end);
  const lo = Math.max(0, Math.min(range[0], ...starts, ...items.map((i) => i.winStart))), hi = Math.min(24, Math.max(range[1], ...ends, ...items.map((i) => i.winEnd)));
  const narrow = w < 520, L = narrow ? 96 : 160, R = 12, T = 8, row = 38, H = T + items.length * row + 30;
  const x = (h) => L + ((h - lo) / (hi - lo)) * (w - L - R);
  const cut = (s) => (s.length > (narrow ? 12 : 20) ? s.slice(0, narrow ? 11 : 19) + "…" : s);
  const ticks = []; for (let k = lo; k <= hi; k += hi - lo > 14 ? 2 : 1) ticks.push(k);
  return (
    <div className="chart" ref={ref}>
      <svg width={w} height={H} role="img" aria-label="Recommended appliance schedule">
        {day.sunrise != null && day.sunset != null ? <rect x={x(Math.max(lo, day.sunrise))} y={T} width={Math.max(0, x(Math.min(hi, day.sunset)) - x(Math.max(lo, day.sunrise)))} height={items.length * row} className="daylight" /> : null}
        {ticks.map((k) => <g key={k}><line x1={x(k)} x2={x(k)} y1={T} y2={T + items.length * row} className="grid" /><text x={x(k)} y={H - 8} textAnchor="middle" className="ax">{fmtHourShort(k)}</text></g>)}
        {items.map((it, i) => {
          const y = T + i * row + 7;
          return (
            <g key={it.id}>
              <text x={L - 10} y={y + 14} textAnchor="end" className="rowlbl">{it.icon ?? ""} {cut(it.name)}</text>
              {it.mode === "flexible" ? <rect x={x(it.winStart)} y={y} width={Math.max(0, x(it.winEnd) - x(it.winStart))} height={22} rx="11" className="window" /> : null}
              {it.start !== null
                ? <rect x={x(it.start)} y={y} width={x(it.end) - x(it.start)} height={22} rx="11" fill={COLORS[it.status]}><title>{`${it.name}: ${fmtClock(it.start)}–${fmtClock(it.end)}`}</title></rect>
                : <text x={x(lo) + 6} y={y + 15} className="ax">No valid slot</text>}
            </g>
          );
        })}
        {nowHour != null && nowHour >= lo && nowHour <= hi ? <line x1={x(nowHour)} x2={x(nowHour)} y1={T} y2={T + items.length * row} className="nowline" /> : null}
      </svg>
      <div className="legend">
        <span><i style={{ background: "var(--green)" }} />Fully on solar</span><span><i style={{ background: "var(--yellow)" }} />Partly solar</span><span><i style={{ background: "var(--red)" }} />Mostly grid</span>
        <span><i className="win" />Your preferred hours</span><span><i className="sunband" />Daylight</span>
      </div>
    </div>
  );
}

export function Donut({ value, label, sub }) {
  const r = 52, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  return (
    <svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label={`${label}: ${Math.round(v * 100)}%`}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="var(--line)" strokeWidth="14" />
      <circle cx="70" cy="70" r={r} fill="none" stroke="var(--cyan)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} transform="rotate(-90 70 70)" style={{ transition: "stroke-dasharray .6s ease" }} />
      <text x="70" y="68" textAnchor="middle" className="dn-v">{Math.round(v * 100)}%</text>
      <text x="70" y="88" textAnchor="middle" className="dn-s">{sub}</text>
    </svg>
  );
}
