import React from "react";
import { Card, Empty, Badge, Info, Skeleton, Icon } from "./ui.jsx";
import { ScheduleChart } from "./charts.jsx";
import { chartRange } from "../lib/solar.js";
import { fmtClock, fmtDuration } from "../lib/time.js";

const ST = { solar: ["On solar", "p-solar"], partial: ["Partly solar", "p-partial"], grid: ["Mostly grid", "p-grid"], invalid: ["No slot", "p-invalid"] };

export default function Schedule({ location, solar, model, dayIdx, setDayIdx, nowHour, hasAppliances }) {
  const d = solar.data;
  const right = (
    <div className="seg" role="tablist" aria-label="Day">
      {["Today", "Tomorrow"].map((t, i) => <button key={t} role="tab" aria-selected={dayIdx === i} className={dayIdx === i ? "on" : ""} onClick={() => setDayIdx(i)}>{t}</button>)}
    </div>
  );
  let body;
  if (!d || !model) body = solar.status === "loading" ? <Skeleton h={220} r={12} /> : <Empty icon="sun" title="Schedule unavailable" text="Load weather data for a location first (step 1)." />;
  else if (!hasAppliances) body = <Empty icon="bolt" title="Nothing to schedule" text="Add or switch on at least one appliance in step 3." />;
  else {
    const m = model[dayIdx], items = m.plan.items, range = chartRange(m.day);
    const solarN = items.filter((i) => i.status === "solar").length;
    body = (
      <>
        <p className="lead">{solarN} of {items.length} appliances can run entirely on solar power {dayIdx ? "tomorrow" : "today"} in {location.name}. Green bars are the recommended times.</p>
        <ScheduleChart items={items} day={m.day} range={range} nowHour={dayIdx === 0 ? nowHour : null} />
        <div className="sched-cards">
          {items.map((it) => {
            const [lab, cls] = ST[it.status];
            return (
              <article key={it.id} className={`sc ${cls}`}>
                <div className="sc-h"><span className="app-ic">{it.icon}</span><b>{it.name}</b><span className={`pill ${cls}`}>{lab}</span></div>
                <div className="sc-t">{it.start !== null ? <><Icon name="clock" size={18} />{fmtClock(it.start)} – {fmtClock(it.end)}<small>{fmtDuration(it.hours)} · {it.kw} kW</small></> : <small>{it.kw} kW for {fmtDuration(it.hours)}</small>}</div>
                <p>{it.reason}</p>
                {it.start !== null ? <div className="sc-e"><span>☀ {it.solarKwh.toFixed(1)} kWh solar</span><span>⚡ {it.gridKwh.toFixed(1)} kWh grid</span></div> : null}
              </article>
            );
          })}
        </div>
      </>
    );
  }
  return <Card id="schedule" step="5" title="Your optimized solar schedule" help="Appliances are placed in the sunniest hours that fit your preferences. High priority goes first." right={right}>{body}</Card>;
}
