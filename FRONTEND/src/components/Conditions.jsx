import React, { useEffect, useState } from "react";
import { Card, Icon, Badge, Info, Skeleton, Empty } from "./ui.jsx";
import { fmtClock, fmtDuration, localClock, offsetLabel } from "../lib/time.js";
import { weatherLabel } from "../lib/weather.js";

function Metric({ icon, label, value, sub, tip }) {
  return (
    <div className="metric">
      <Icon name={icon} size={22} />
      <div><small>{label}{tip ? <Info text={tip} /> : null}</small><b>{value}</b>{sub ? <span>{sub}</span> : null}</div>
    </div>
  );
}

export default function Conditions({ location, solar, dayIdx }) {
  const d = solar.data;
  const [clock, setClock] = useState(d ? localClock(d.utcOffsetSec) : null);
  useEffect(() => {
    if (!d) return;
    const tick = () => setClock(localClock(d.utcOffsetSec));
    tick();
    const iv = setInterval(tick, 20000);
    return () => clearInterval(iv);
  }, [d]);

  let body;
  if (solar.status === "loading" && !d) body = <div className="metrics">{[0, 1, 2, 3, 4, 5].map((i) => <div className="metric" key={i}><Skeleton h={44} /></div>)}</div>;
  else if (!d) body = <Empty icon="cloud" title="No weather data yet" text={solar.status === "error" ? "The last request failed. Use Retry in step 1." : "Choose a location to load its weather and sunlight."} />;
  else {
    const day = d.days[dayIdx], now = clock ? Math.min(23, Math.floor(clock.hour)) : 12;
    const cur = dayIdx === 0 && d.current ? d.current : null;
    const hr = day.hours[now];
    const temp = cur ? cur.temp : hr.temp, cloud = cur ? cur.cloud : hr.cloud;
    const ghiNow = dayIdx === 0 ? hr.ghi : Math.max(...day.hours.map((x) => x.ghi));
    body = (
      <div className="metrics">
        <Metric icon="thermo" label={dayIdx === 0 ? "Temperature now" : "Expected high"} value={dayIdx === 0 ? `${temp.toFixed(1)}°C` : `${day.tMax != null ? day.tMax.toFixed(1) : "—"}°C`} sub={`${dayIdx ? "Low/high" : "Today"} ${day.tMin != null ? Math.round(day.tMin) : "—"}° to ${day.tMax != null ? Math.round(day.tMax) : "—"}°C`} />
        <Metric icon="cloud" label="Cloud cover" value={`${Math.round(dayIdx === 0 ? cloud : day.hours.slice(9, 16).reduce((s, x) => s + x.cloud, 0) / 7)}%`} sub={dayIdx === 0 ? weatherLabel(cur && cur.code) : "Midday average"} tip="Share of the sky covered by cloud. More cloud means less sunlight reaches your panels." />
        <Metric icon="sun" label={dayIdx === 0 ? "Sunlight now" : "Peak sunlight"} value={`${Math.round(ghiNow)} W/m²`} sub="Solar irradiance" tip="Power of sunlight on each square metre of flat ground (global horizontal irradiance). About 1000 W/m² is full midday sun." />
        <Metric icon="sunrise" label="Sunrise" value={fmtClock(day.sunrise)} sub={`Local time, ${d.tzAbbr || offsetLabel(d.utcOffsetSec)}`} />
        <Metric icon="sunset" label="Sunset" value={fmtClock(day.sunset)} sub={day.sunrise != null && day.sunset != null ? `${fmtDuration(day.sunset - day.sunrise)} of daylight` : ""} />
        <Metric icon="clock" label="Local time" value={clock ? fmtClock(clock.hour) : "—"} sub={`${d.timezone} · ${offsetLabel(d.utcOffsetSec)}`} />
      </div>
    );
  }
  return (
    <Card id="conditions" title={`Sky conditions in ${location.name}`} help="Fetched from the weather API for the selected coordinates." right={<Badge kind="live" />}>
      {body}
    </Card>
  );
}
