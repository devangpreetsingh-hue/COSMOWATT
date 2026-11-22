import React from "react";
import { Card, Empty, Badge, Info, Skeleton, Icon } from "./ui.jsx";
import { IrradianceChart, GenerationChart, Donut } from "./charts.jsx";
import { chartRange, irradiationKwhM2 } from "../lib/solar.js";
import { fmtClock, fmtDuration } from "../lib/time.js";

function Kpi({ icon, label, value, unit, sub, tip, tone = "" }) {
  return (
    <div className={`kpi ${tone}`}>
      <div className="kpi-h"><Icon name={icon} size={20} /><small>{label}</small>{tip ? <Info text={tip} /> : null}</div>
      <b>{value}<span>{unit}</span></b>
      {sub ? <p>{sub}</p> : null}
    </div>
  );
}

export default function Insights({ location, solar, model, dayIdx, nowHour, prefs, hasAppliances }) {
  const d = solar.data;
  let body;
  if (!d || !model) body = solar.status === "loading" ? <div className="kpis">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={110} r={14} />)}</div> : <Empty icon="bolt" title="No insights yet" text="Insights appear once weather data has loaded for your location." />;
  else {
    const m = model[dayIdx], a = m.an, range = chartRange(m.day), pk = a.peak;
    body = (
      <>
        <div className="kpis">
          <Kpi icon="sun" tone="cyan" label="Expected solar generation" value={a.genKwh.toFixed(1)} unit="kWh" sub={`From ${prefs.panelKw} kW of panels · ${irradiationKwhM2(m.day).toFixed(1)} kWh/m² of sunlight`} tip="Estimated energy your panels make over the day, from forecast sunlight and temperature." />
          <Kpi icon="bolt" label="Estimated consumption" value={a.consKwh.toFixed(1)} unit="kWh" sub={`${(prefs.baseLoadKw * 24).toFixed(1)} kWh always-on + appliances`} tip="Always-on load for 24 hours plus every appliance you switched on." />
          <Kpi icon="leaf" tone="green" label="Solar utilization" value={Math.round(a.utilization * 100)} unit="%" sub={`${a.usedKwh.toFixed(1)} kWh of your solar is used at home`} tip="Share of the solar energy produced that your home uses at the moment it is made." />
          <Kpi icon="plus" tone="yellow" label="Available surplus" value={a.surplusKwh.toFixed(1)} unit="kWh" sub={a.surplusKwh > 0.05 ? "Spare solar: room for another appliance, a battery or export" : "All your solar is being used"} tip="Solar energy made when the home isn't using it. Without a battery or export it is wasted." />
          <Kpi icon="sun" label="Peak solar hours" value={pk ? `${fmtClock(pk.start)}–${fmtClock(pk.end)}` : "—"} unit="" sub={pk ? `${fmtDuration(pk.end - pk.start)} within 80% of the ${pk.peakKw.toFixed(1)} kW peak` : "No meaningful sunshine forecast"} tip="The hours when output stays within 80% of its highest value. The best time for heavy appliances." />
          <Kpi icon="refresh" tone="green" label="Estimated savings" value={`₹${Math.round(a.savings)}`} unit="/day" sub={`${a.usedKwh.toFixed(1)} kWh × ₹${prefs.tariff}/kWh. About ₹${Math.round(a.savings * 30)} a month.`} tip="Grid electricity you don't buy because solar covered it, at the price you entered in step 4." />
          <Kpi icon="bolt" label="Self-sufficiency" value={Math.round(a.selfSufficiency * 100)} unit="%" sub={`${a.gridKwh.toFixed(1)} kWh still comes from the grid`} tip="Share of your daily consumption covered directly by solar. Without a battery, night-time use always needs the grid." />
          <Kpi icon="clock" label="Gained by smart scheduling" value={`+${a.scheduleGainKwh.toFixed(1)}`} unit="kWh" sub={hasAppliances ? "More solar used than if every appliance started at the beginning of its preferred hours" : "Add appliances to see the gain"} tip="Compares this schedule with simply starting each appliance at the start of its preferred window." />
        </div>
        <div className="charts2">
          <div className="panel">
            <div className="panel-h"><h3>Sunlight and cloud cover</h3><Badge kind="live" /></div>
            <p className="help">Hour-by-hour weather for {location.name}. This is what drives the forecast.</p>
            <IrradianceChart day={m.day} range={range} nowHour={dayIdx === 0 ? nowHour : null} />
          </div>
          <div className="panel">
            <div className="panel-h"><h3>Solar output vs your use</h3><Badge kind="est" /></div>
            <p className="help">Where the cyan bars are taller than the yellow line, you have free surplus solar power.</p>
            <GenerationChart day={m.day} pv={m.pv} cons={m.plan.consumption} range={range} nowHour={dayIdx === 0 ? nowHour : null} />
          </div>
        </div>
        <div className="panel split">
          <div className="donut"><Donut value={a.utilization} label="Solar utilization" sub="used at home" /></div>
          <div>
            <h3>Where today’s solar goes</h3>
            <ul className="flow-list">
              <li><i style={{ background: "var(--cyan)" }} /><b>{a.usedKwh.toFixed(1)} kWh</b> powers your home directly</li>
              <li><i style={{ background: "var(--line)" }} /><b>{a.surplusKwh.toFixed(1)} kWh</b> is surplus with nowhere to go (battery and export are not modeled)</li>
              <li><i style={{ background: "var(--yellow)" }} /><b>{a.gridKwh.toFixed(1)} kWh</b> of your consumption still comes from the grid</li>
            </ul>
          </div>
        </div>
      </>
    );
  }
  return <Card id="insights" step="6" title="Energy insights" help={`Numbers for ${dayIdx ? "tomorrow" : "today"} in ${location.name}. They update whenever you change the location, appliances or preferences.`}>{body}</Card>;
}
