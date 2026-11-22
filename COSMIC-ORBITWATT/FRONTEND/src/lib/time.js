// Clock helpers. Everything is computed from the *selected location's* UTC offset,
// never from the browser's own time zone.
export const pad = (n) => String(n).padStart(2, "0");

/** Current local date + decimal hour at a place with the given UTC offset (seconds). */
export function localClock(offsetSec, nowMs = Date.now()) {
  const d = new Date(nowMs + offsetSec * 1000);
  return {
    date: d.toISOString().slice(0, 10),
    hour: d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600,
  };
}

export function fmtClock(h) {
  if (h == null || !isFinite(h)) return "—";
  const m = Math.round(h * 60) % 1440;
  const H = Math.floor(m / 60), M = m % 60;
  return `${H % 12 || 12}:${pad(M)} ${H < 12 ? "AM" : "PM"}`;
}
export function fmtHourShort(h) {
  const H = ((Math.round(h) % 24) + 24) % 24;
  return `${H % 12 || 12} ${H < 12 ? "AM" : "PM"}`;
}
export function fmtDuration(hours) {
  const m = Math.round(hours * 60), h = Math.floor(m / 60), mm = m % 60;
  return h && mm ? `${h} h ${mm} min` : h ? `${h} h` : `${mm} min`;
}
export function fmtCountdown(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
/** "2026-11-22T06:48" -> 6.8 */
export function isoToHour(iso) {
  const m = /T(\d{2}):(\d{2})/.exec(iso || "");
  return m ? +m[1] + +m[2] / 60 : null;
}
export function offsetLabel(sec) {
  const sign = sec < 0 ? "-" : "+", a = Math.abs(sec), h = Math.floor(a / 3600), m = Math.round((a % 3600) / 60);
  return `UTC${sign}${h}${m ? ":" + pad(m) : ""}`;
}
export function fmtAge(ms) {
  const m = Math.floor(ms / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ${m % 60} min ago`;
}
export function fmtLatLon(lat, lon) {
  return `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(3)}°${lon >= 0 ? "E" : "W"}`;
}
