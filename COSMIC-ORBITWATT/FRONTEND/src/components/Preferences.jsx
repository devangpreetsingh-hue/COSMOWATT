import React from "react";
import { Card, Info } from "./ui.jsx";

function Slider({ id, label, tip, value, min, max, step, unit, fmt, onChange }) {
  return (
    <div className="slider">
      <label htmlFor={id}>{label}{tip ? <Info text={tip} /> : null}</label>
      <div className="sl-row"><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} /><output htmlFor={id}>{fmt ? fmt(value) : value} {unit}</output></div>
    </div>
  );
}

export default function Preferences({ prefs, setPrefs }) {
  const set = (k) => (v) => setPrefs((p) => ({ ...p, [k]: v }));
  return (
    <Card id="preferences" step="4" title="Set your energy preferences" help="These numbers shape the forecast and schedule. Everything updates as you move them." right={<span className="badge b-input">Your input</span>}>
      <Slider id="p-panel" label="Solar panel size" tip="Total capacity of your panels, in kilowatts-peak (kWp). It is printed on your inverter or solar bill." value={prefs.panelKw} min={1} max={20} step={0.5} unit="kW" onChange={set("panelKw")} />
      <Slider id="p-base" label="Always-on load" tip="Power your home uses all day no matter what: fridge, router, lights, standby devices." value={prefs.baseLoadKw} min={0.1} max={3} step={0.1} unit="kW" fmt={(v) => v.toFixed(1)} onChange={set("baseLoadKw")} />
      <Slider id="p-margin" label="Safety margin" tip="Solar forecasts can be off. We hold back this share of the forecast so appliances don't stall when a cloud passes." value={prefs.margin} min={0} max={0.4} step={0.05} unit="" fmt={(v) => Math.round(v * 100) + "%"} onChange={set("margin")} />
      <div className="slider">
        <label htmlFor="p-tariff">Electricity price<Info text="What one unit (kWh) from the grid costs you. Used only to estimate savings." /></label>
        <div className="sl-row"><span className="cur">₹</span><input id="p-tariff" className="num" type="number" min="0" max="100" step="0.5" value={prefs.tariff} onChange={(e) => set("tariff")(Math.max(0, +e.target.value || 0))} /><span className="unit">per kWh</span></div>
      </div>
    </Card>
  );
}
