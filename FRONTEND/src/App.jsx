import React, { useCallback, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { CFG } from "./lib/config.js";
import { reverseGeocode } from "./lib/api.js";
import { pvSeries } from "./lib/solar.js";
import { planDay, mainWindow, analyze } from "./lib/schedule.js";
import { DEFAULT_APPLIANCES, DEFAULT_PREFS } from "./lib/presets.js";
import { localClock } from "./lib/time.js";
import { useSolarData } from "./hooks/useSolarData.js";
import { Icon } from "./components/ui.jsx";
import Toasts from "./components/Toasts.jsx";
import Stepper from "./components/Stepper.jsx";
import LocationCard from "./components/LocationCard.jsx";
import Conditions from "./components/Conditions.jsx";
import Countdown from "./components/Countdown.jsx";
import Appliances from "./components/Appliances.jsx";
import Preferences from "./components/Preferences.jsx";
import Schedule from "./components/Schedule.jsx";
import Insights from "./components/Insights.jsx";
import Sources from "./components/Sources.jsx";

const KEY = "orbitwatt.v05";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* storage unavailable */ } };

export default function App() {
  const saved = useRef(load()).current;
  const [location, setLocation] = useState(saved.location || CFG.DEFAULT_LOCATION);
  const [appliances, setAppliancesRaw] = useState(saved.appliances || DEFAULT_APPLIANCES());
  const [prefs, setPrefsRaw] = useState({ ...DEFAULT_PREFS, ...(saved.prefs || {}) });
  const [dayIdx, setDayIdx] = useState(0);
  const [toasts, setToasts] = useState([]);
  const dlg = useRef(null);

  const persist = useRef({});
  const setAppliances = useCallback((f) => setAppliancesRaw((p) => { const n = typeof f === "function" ? f(p) : f; persist.current.appliances = n; save({ ...saved, ...persist.current }); return n; }), []);
  const setPrefs = useCallback((f) => setPrefsRaw((p) => { const n = typeof f === "function" ? f(p) : f; persist.current.prefs = n; save({ ...saved, ...persist.current }); return n; }), []);

  const notify = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((l) => [...l.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), 4500);
  }, []);

  const select = useCallback((loc) => {
    setLocation(loc); persist.current.location = loc; save({ ...saved, ...persist.current }); setDayIdx(0);
  }, []);
  const mapPick = useCallback((lat, lon, source) => {
    const la = +Math.max(-85, Math.min(85, lat)).toFixed(4), lo = +(((lon + 540) % 360) - 180).toFixed(4);
    select({ name: `Pinned point`, admin1: "", country: "", lat: la, lon: lo, source });
    // Name the point afterwards; only applied if the selection hasn't changed meanwhile.
    reverseGeocode(la, lo).then((r) => { if (r && r.name) setLocation((cur) => (cur.lat === la && cur.lon === lo ? { ...cur, ...r } : cur)); });
  }, [select]);

  const solar = useSolarData(location, notify);

  // Everything below is recomputed from the CURRENT dataset, appliances and preferences.
  const model = useMemo(() => {
    if (!solar.data) return null;
    return solar.data.days.map((day) => {
      const pv = pvSeries(day, prefs.panelKw);
      const plan = planDay(appliances, pv, prefs);
      return { day, pv, plan, win: mainWindow(plan, pv, prefs, appliances), an: analyze({ pv, plan, appliances, baseLoadKw: prefs.baseLoadKw, tariff: prefs.tariff }) };
    });
  }, [solar.data, appliances, prefs]);

  const hasApps = appliances.some((a) => a.enabled);
  const nowHour = solar.data ? localClock(solar.data.utcOffsetSec).hour : null;
  const done = [true, !!solar.data, hasApps, true, !!model && hasApps, !!model];

  return (
    <div className="app">
      <header className="top">
        <b className="logo"><Icon name="sun" size={22} />ORBIT<i>WATT</i></b>
        <div className="top-r">
          <span className={`live ${solar.data ? "ok" : solar.status === "error" ? "bad" : ""}`}>
            {solar.status === "loading" ? "Loading data…" : solar.data ? `Live data: Open-Meteo · ${location.name}` : "No data loaded"}
          </span>
          {solar.data ? <button className="btn sm" onClick={solar.refresh} disabled={solar.status === "loading"}><Icon name="refresh" size={16} />Refresh</button> : null}
          <button className="btn sm" onClick={() => dlg.current.showModal()}><Icon name="play" size={16} />Intro video</button>
        </div>
      </header>
      <main className="wrap">
        <section className="intro"><h1>Run your home on free solar power.</h1><p>Choose your city, add your appliances, and ORBITWATT builds a schedule from that city's real forecast.</p></section>
        <Stepper done={done} />
        {solar.status === "error" && !solar.data ? (
          <div className="banner err" role="alert"><Icon name="alert" />Couldn't load data for {location.name}: {String(solar.error && solar.error.message)}<button className="btn sm" onClick={solar.refresh}>Retry</button></div>
        ) : null}
        <div className="cols">
          <LocationCard location={location} onSelect={select} onMapPick={mapPick} solar={solar} notify={notify} />
          <div className="stack">
            <Countdown location={location} solar={solar} model={model} hasAppliances={hasApps} />
            <Conditions location={location} solar={solar} dayIdx={dayIdx} />
          </div>
        </div>
        <div className="cols eq">
          <Appliances appliances={appliances} setAppliances={setAppliances} plan={model ? model[dayIdx].plan : null} notify={notify} />
          <Preferences prefs={prefs} setPrefs={setPrefs} />
        </div>
        <Schedule location={location} solar={solar} model={model} dayIdx={dayIdx} setDayIdx={setDayIdx} nowHour={nowHour} hasAppliances={hasApps} />
        <Insights location={location} solar={solar} model={model} dayIdx={dayIdx} nowHour={nowHour} prefs={prefs} hasAppliances={hasApps} />
        <Sources solar={solar} location={location} />
      </main>
      <dialog ref={dlg} className="vd"><video src="/media/ORBITWATT-intro.mp4" controls preload="none" /><form method="dialog"><button className="btn">Close</button></form></dialog>
      <Toasts items={toasts} onClose={(id) => setToasts((l) => l.filter((x) => x.id !== id))} />
    </div>
  );
}
