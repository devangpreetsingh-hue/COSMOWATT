import React, { useEffect, useRef, useState } from "react";
import { searchPlaces, describeError } from "../lib/api.js";
import { Icon } from "./ui.jsx";

const label = (p) => [p.admin1, p.country].filter(Boolean).join(", ");

export default function CitySearch({ onSelect, onGps }) {
  const [q, setQ] = useState("");
  const [state, setState] = useState({ status: "idle", results: [], error: "" });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef(null), seq = useRef(0), ctrl = useRef(null);

  // Debounced autocomplete against the Open-Meteo Geocoding API.
  useEffect(() => {
    const text = q.trim();
    if (ctrl.current) ctrl.current.abort();
    if (text.length < 2) { setState({ status: "idle", results: [], error: "" }); return; }
    const id = ++seq.current;
    const c = new AbortController();
    ctrl.current = c;
    setState((s) => ({ ...s, status: "loading", error: "" }));
    const t = setTimeout(async () => {
      try {
        const results = await searchPlaces(text, { signal: c.signal });
        if (id === seq.current) { setState({ status: "done", results, error: "" }); setActive(results.length ? 0 : -1); }
      } catch (e) {
        if (id === seq.current && e.kind !== "aborted") setState({ status: "error", results: [], error: describeError(e, "city suggestions") });
      }
    }, 250);
    return () => { clearTimeout(t); c.abort(); };
  }, [q]);

  useEffect(() => {
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, []);

  const pick = (p) => { setQ(""); setOpen(false); setState({ status: "idle", results: [], error: "" }); onSelect(p); };
  const onKey = (e) => {
    const n = state.results.length;
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => (n ? (a + 1) % n : -1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (n ? (a - 1 + n) % n : -1)); }
    else if (e.key === "Enter" && open && state.results[active]) { e.preventDefault(); pick(state.results[active]); }
    else if (e.key === "Escape") setOpen(false);
  };
  const showList = open && q.trim().length >= 2;

  return (
    <div className="search" ref={box}>
      <label htmlFor="city-q" className="lbl">Search for a city</label>
      <div className="search-row">
        <div className="input-icon">
          <Icon name="search" size={18} />
          <input id="city-q" type="search" value={q} autoComplete="off" placeholder="Try “Jaipur”, “Mumbai” or “Delhi”"
            role="combobox" aria-expanded={showList} aria-controls="city-list" aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `city-opt-${active}` : undefined}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey} />
          {state.status === "loading" ? <span className="spin" aria-label="Searching" /> : null}
        </div>
        <button type="button" className="btn" onClick={onGps} title="Use your device's location"><Icon name="gps" size={18} />Use my location</button>
      </div>
      {showList ? (
        <ul id="city-list" className="suggest" role="listbox">
          {state.status === "error" ? <li className="sg-msg err">{state.error}</li> : null}
          {state.status === "done" && !state.results.length ? <li className="sg-msg">No city found for “{q.trim()}”. Check the spelling or click the map instead.</li> : null}
          {state.status === "loading" && !state.results.length ? <li className="sg-msg">Searching…</li> : null}
          {state.results.map((p, i) => (
            <li key={p.id ?? `${p.lat},${p.lon}`} id={`city-opt-${i}`} role="option" aria-selected={i === active}
              className={i === active ? "on" : ""} onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); pick(p); }}>
              <Icon name="pin" size={18} />
              <span><b>{p.name}</b><small>{label(p) || "—"}</small></span>
              <small className="coord">{p.lat.toFixed(2)}°, {p.lon.toFixed(2)}°</small>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
