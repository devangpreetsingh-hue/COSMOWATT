import React from "react";
import { Card, Badge } from "./ui.jsx";
import { CFG } from "../lib/config.js";
import { SYSTEM_EFFICIENCY } from "../lib/solar.js";

export default function Sources({ solar, location }) {
  const d = solar.data, x = solar.extra;
  const rows = [
    ["City search and coordinates", "Open-Meteo Geocoding API (map clicks use reverse geocoding)", "live"],
    ["Temperature, cloud cover, sunlight (W/m²)", d ? `Open-Meteo Forecast API at grid point ${d.gridLat.toFixed(2)}°, ${d.gridLon.toFixed(2)}°. These are weather-model values, not readings from a sensor on your roof.` : "Open-Meteo Forecast API", "live"],
    ["Sunrise, sunset, time zone", "Open-Meteo Forecast API", "live"],
    ["Solar generation (kW, kWh)", `Estimated: sunlight × panel size × ${Math.round(SYSTEM_EFFICIENCY * 100)}% system efficiency, reduced for hot panels. Uses flat-ground sunlight, so roof tilt, direction and shading are not modeled.`, "est"],
    ["Schedule, utilization, surplus, savings", "Estimated by ORBITWATT from the numbers above and your own inputs.", "est"],
    ["Appliances, panel size, load, price", "Entered by you.", "input"],
    ["Battery storage", "Not modeled. Night-time use is counted as grid power.", "est"],
  ];
  if (CFG.BACKEND_URL) rows.push(["NASA POWER recent-average sunlight", x ? `Backend reachable. Recent average peak ${Math.round(Math.max(...x.sw))} W/m² (for comparison only).` : "Backend configured but no NASA POWER data returned for this location.", "live"]);
  return (
    <Card id="sources" title="Where the numbers come from" help="What is real forecast data, what is estimated, and what you typed in.">
      <div className="src-list">
        {rows.map((r) => <div className="src" key={r[0]}><Badge kind={r[2]} /><div><b>{r[0]}</b><p>{r[1]}</p></div></div>)}
      </div>
      <p className="note">Hourly sunlight from Open-Meteo is stamped at the end of each hour, so each hour's block uses the value that follows it. All times are in {location.name}'s local time{d ? ` (${d.timezone})` : ""}. Data is cached for 15 minutes and the dashboard shows when it was last fetched.</p>
    </Card>
  );
}
