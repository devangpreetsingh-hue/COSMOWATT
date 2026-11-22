import React, { useState } from "react";
import { Card, Icon } from "./ui.jsx";
import CitySearch from "./CitySearch.jsx";
import MapPicker from "./MapPicker.jsx";
import { searchPlaces, describeError } from "../lib/api.js";
import { fmtLatLon, fmtAge, offsetLabel } from "../lib/time.js";

const QUICK = ["Ahmedabad", "Jaipur", "Mumbai", "Delhi"];
const place = (l) => [l.name, l.admin1, l.country].filter(Boolean).join(", ");

export default function LocationCard({ location, onSelect, onMapPick, solar, notify }) {
  const [lat, setLat] = useState(""), [lon, setLon] = useState(""), [busy, setBusy] = useState("");

  const gps = () => {
    if (!navigator.geolocation) return notify({ type: "error", text: "This browser can't share your location. Search for a city instead." });
    navigator.geolocation.getCurrentPosition(
      (p) => onMapPick(p.coords.latitude, p.coords.longitude, "gps"),
      () => notify({ type: "error", text: "Location access is blocked. Allow it in your browser, or search for a city." }),
      { timeout: 8000 });
  };
  // Quick chips go through the same geocoding API as typed searches.
  const quick = async (name) => {
    setBusy(name);
    try {
      const r = await searchPlaces(name);
      const p = r.find((x) => x.countryCode === "IN") || r[0];
      if (p) onSelect(p); else notify({ type: "error", text: `Couldn't find “${name}”.` });
    } catch (e) { notify({ type: "error", text: describeError(e, "city search") }); }
    setBusy("");
  };
  const go = (e) => {
    e.preventDefault();
    const la = parseFloat(lat), lo = parseFloat(lon);
    if (!isFinite(la) || !isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180)
      return notify({ type: "error", text: "Latitude must be between −90 and 90, and longitude between −180 and 180." });
    onMapPick(la, lo, "coords");
  };

  const d = solar.data;
  let status;
  if (solar.status === "loading") status = <div className="confirm c-load"><span className="spin" />Loading live weather and solar data for <b>{location.name}</b>…</div>;
  else if (solar.status === "error" && !d) status = <div className="confirm c-err"><Icon name="alert" />Data for <b>{location.name}</b> did not load.<button className="btn sm" onClick={solar.refresh}>Retry</button></div>;
  else if (d) status = (
    <div className="confirm c-ok"><Icon name="check" />
      <span>Dashboard is showing data for <b>{place(location)}</b> · weather grid point {d.gridLat.toFixed(2)}°, {d.gridLon.toFixed(2)}° · {d.timezone} ({offsetLabel(d.utcOffsetSec)}) · updated {fmtAge(Date.now() - d.fetchedAt)}{solar.fromCache ? " (saved copy)" : ""}</span>
    </div>);

  return (
    <Card id="location" step="1" title="Choose your location" help="Pick a city, click the map, or use your device location. The whole dashboard reloads for the place you choose.">
      <CitySearch onSelect={onSelect} onGps={gps} />
      <div className="chips" aria-label="Quick picks">
        <span className="lbl">Quick picks:</span>
        {QUICK.map((n) => <button key={n} type="button" className="chip" disabled={!!busy} onClick={() => quick(n)}>{busy === n ? "…" : n}</button>)}
      </div>
      <div className="selected">
        <div className="sel-ic"><Icon name="pin" size={24} /></div>
        <div className="sel-t"><small>Selected location</small><b>{place(location)}</b></div>
        <div className="sel-c"><small>Latitude, longitude</small><b>{fmtLatLon(location.lat, location.lon)}</b></div>
      </div>
      <MapPicker lat={location.lat} lon={location.lon} onPick={(la, lo) => onMapPick(la, lo, "map")} />
      <details className="adv">
        <summary>Enter coordinates manually</summary>
        <form className="coords" onSubmit={go}>
          <label>Latitude<input inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="e.g. 26.912" /></label>
          <label>Longitude<input inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="e.g. 75.787" /></label>
          <button className="btn" type="submit">Load this point</button>
        </form>
      </details>
      <div aria-live="polite">{status}</div>
    </Card>
  );
}
