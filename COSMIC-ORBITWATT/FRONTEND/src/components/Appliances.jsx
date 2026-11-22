import React from "react";
import { Card, Icon, Info, Empty } from "./ui.jsx";
import { APPLIANCE_TYPES, makeAppliance, typeInfo } from "../lib/presets.js";
import { fmtHourShort } from "../lib/time.js";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function Row({ a, onChange, onRemove, result }) {
  const set = (patch) => onChange({ ...a, ...patch });
  const changeType = (type) => { const t = typeInfo(type); onChange({ ...a, type, name: t.label, kw: t.kw, hours: t.hours, winStart: t.winStart, winEnd: t.winEnd, priority: t.priority, mode: t.mode }); };
  const num = (v, lo, hi) => Math.min(hi, Math.max(lo, +v || lo));
  return (
    <article className={`app-row ${a.enabled ? "" : "off"}`}>
      <div className="app-top">
        <label className="switch" title={a.enabled ? "Included in the schedule" : "Excluded from the schedule"}>
          <input type="checkbox" checked={a.enabled} onChange={(e) => set({ enabled: e.target.checked })} aria-label={`Include ${a.name}`} /><span />
        </label>
        <span className="app-ic">{typeInfo(a.type).icon}</span>
        <input className="name" value={a.name} aria-label="Appliance name" onChange={(e) => set({ name: e.target.value })} />
        {result && a.enabled ? <span className={`pill p-${result.status}`}>{result.status === "solar" ? "On solar" : result.status === "partial" ? "Partly solar" : result.status === "grid" ? "Grid" : "No slot"}</span> : null}
        <button type="button" className="icon-btn danger" onClick={onRemove} aria-label={`Remove ${a.name}`}><Icon name="trash" size={18} /></button>
      </div>
      <div className="app-fields">
        <label>Type<select value={a.type} onChange={(e) => changeType(e.target.value)}>{APPLIANCE_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}</select></label>
        <label>Power (kW)<input type="number" min="0.05" max="20" step="0.05" value={a.kw} onChange={(e) => set({ kw: num(e.target.value, 0.05, 20) })} /></label>
        <label>Runs for (hours)<input type="number" min="1" max="12" step="1" value={a.hours} onChange={(e) => set({ hours: Math.round(num(e.target.value, 1, 12)) })} /></label>
        <label>Priority<Info text="High-priority appliances get the best sunny slots first." /><select value={a.priority} onChange={(e) => set({ priority: +e.target.value })}><option value={1}>High</option><option value={2}>Medium</option><option value={3}>Low</option></select></label>
        <label>Scheduling<Info text="Flexible: we choose the best start time inside your preferred hours. Fixed: it always starts at the time you set." />
          <select value={a.mode} onChange={(e) => set({ mode: e.target.value })}><option value="flexible">Flexible</option><option value="fixed">Fixed start</option></select></label>
        {a.mode === "fixed"
          ? <label>Starts at<select value={a.winStart} onChange={(e) => set({ winStart: +e.target.value })}>{HOURS.map((h) => <option key={h} value={h}>{fmtHourShort(h)}</option>)}</select></label>
          : <label className="span2">Preferred hours<span className="pair">
              <select aria-label="Earliest start" value={a.winStart} onChange={(e) => set({ winStart: +e.target.value })}>{HOURS.map((h) => <option key={h} value={h}>{fmtHourShort(h)}</option>)}</select><i>to</i>
              <select aria-label="Must finish by" value={a.winEnd} onChange={(e) => set({ winEnd: +e.target.value })}>{HOURS.slice(1).concat(24).map((h) => <option key={h} value={h}>{h === 24 ? "12 AM" : fmtHourShort(h)}</option>)}</select></span></label>}
      </div>
      {result && a.enabled && result.status === "invalid" ? <p className="note warn">{result.reason}</p> : null}
    </article>
  );
}

export default function Appliances({ appliances, setAppliances, plan, notify }) {
  const update = (a) => setAppliances((l) => l.map((x) => (x.id === a.id ? a : x)));
  const remove = (a) => { setAppliances((l) => l.filter((x) => x.id !== a.id)); notify({ type: "success", text: `Removed ${a.name}.` }); };
  const add = (type) => { const a = makeAppliance(type); setAppliances((l) => [...l, a]); notify({ type: "success", text: `Added ${a.name}.` }); };
  const res = (id) => (plan ? plan.items.find((i) => i.id === id) : null);
  return (
    <Card id="appliances" step="3" title="Add your appliances" help="List what you want to run on solar power. Switch an appliance off to leave it out without deleting it." right={<Badge2 />}>
      {appliances.length ? <div className="app-list">{appliances.map((a) => <Row key={a.id} a={a} onChange={update} onRemove={() => remove(a)} result={res(a.id)} />)}</div>
        : <Empty icon="bolt" title="No appliances yet" text="Add your first appliance below to get a solar schedule." />}
      <div className="add-bar">
        <span className="lbl">Add an appliance:</span>
        <div className="add-chips">{APPLIANCE_TYPES.map((t) => <button type="button" key={t.type} className="chip" onClick={() => add(t.type)}><Icon name="plus" size={14} />{t.icon} {t.label}</button>)}</div>
      </div>
    </Card>
  );
}
const Badge2 = () => <span className="badge b-input">Your input</span>;
