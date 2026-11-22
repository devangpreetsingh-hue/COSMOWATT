import React, { useEffect, useState } from "react";
import { Icon, Info, Skeleton } from "./ui.jsx";
import { fmtClock, fmtCountdown, fmtDuration, localClock } from "../lib/time.js";
import { countdownTarget } from "../lib/schedule.js";

/** Free-power launch window: counts down on the selected location's own clock. */
export default function Countdown({ location, solar, model, hasAppliances }) {
  const d = solar.data;
  const [t, setT] = useState(() => (d ? localClock(d.utcOffsetSec).hour : 0));
  useEffect(() => {
    if (!d) return;
    const tick = () => setT(localClock(d.utcOffsetSec).hour);
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [d]);

  if (!d || !model) {
    return (
      <section className="card hero" aria-busy={solar.status === "loading"}>
        <p className="eyebrow"><Icon name="bolt" size={16} />Free-power launch window</p>
        {solar.status === "error" ? <><h2 className="hero-h">Waiting for weather data</h2><p className="hero-p">We couldn't load solar data for {location.name}, so there is no countdown yet.</p></>
          : <><Skeleton h={30} w="60%" /><div style={{ height: 14 }} /><Skeleton h={72} w="75%" /><div style={{ height: 14 }} /><Skeleton h={18} /></>}
      </section>
    );
  }
  const tgt = countdownTarget(model[0].win, model[1].win, t);
  const w = tgt.window;
  const label = tgt.mode === "live" ? "Free power is live — window closes in" : tgt.mode === "upcoming" ? `Next free-power window opens in${tgt.dayOffset ? " (tomorrow)" : ""}` : "No free-power window";
  return (
    <section className={`card hero ${tgt.mode === "live" ? "is-live" : ""}`}>
      <p className="eyebrow"><Icon name="bolt" size={16} />Free-power launch window · {location.name}<Info text="A free-power window is a stretch of daytime when your panels make more power than your always-on load needs, so appliances can run without grid electricity. Times use the selected city's own clock." /></p>
      <h2 className="hero-h">{label}</h2>
      <div className="digits" aria-live="off">{tgt.seconds == null ? "--:--:--" : fmtCountdown(tgt.seconds)}</div>
      {w ? (
        <div className="hero-grid">
          <div><small>Starts</small><b>{fmtClock(w.start)}{tgt.dayOffset ? " tomorrow" : ""}</b></div>
          <div><small>Lasts</small><b>{fmtDuration(w.duration)}</b></div>
          <div><small>Ends</small><b>{fmtClock(w.end)}</b></div>
          <div><small>Peak output</small><b>{w.peakPvKw.toFixed(1)} kW</b></div>
        </div>
      ) : null}
      {w ? (
        <>
          <div className="hero-run">
            <small>Run during this window</small>
            {w.appliances.length ? <div className="pills">{w.appliances.map((a) => <span key={a.id} className={`pill p-${a.status}`}>{a.icon} {a.name}<em>{fmtClock(a.start)}</em></span>)}</div>
              : <p className="hero-p">{hasAppliances ? "None of your appliances are scheduled inside this window yet." : "Add appliances in step 3 to see what to run."}</p>}
          </div>
          <p className="why"><b>Why this time?</b> {w.why}</p>
        </>
      ) : <p className="hero-p">Not enough spare solar power in the next two days to run your smallest appliance on its own. Try a larger panel size, a smaller always-on load, or a lower safety margin in step 4.</p>}
    </section>
  );
}
