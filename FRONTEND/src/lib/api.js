import { CFG } from "./config.js";
import { isoToHour, localClock } from "./time.js";

export class ApiError extends Error {
  constructor(kind, message, status) {
    super(message);
    this.name = "ApiError";
    this.kind = kind; // aborted | timeout | network | http | data
    this.status = status;
  }
}

const KEYED = !!CFG.OPEN_METEO_API_KEY;
const OM_FORECAST = (KEYED ? "https://customer-api.open-meteo.com" : "https://api.open-meteo.com") + "/v1/forecast";
const OM_GEOCODE = (KEYED ? "https://customer-geocoding-api.open-meteo.com" : "https://geocoding-api.open-meteo.com") + "/v1/search";
const withKey = (u) => (KEYED ? u + "&apikey=" + encodeURIComponent(CFG.OPEN_METEO_API_KEY) : u);

function linkSignal(parent, ms) {
  const c = new AbortController();
  let timedOut = false;
  const t = setTimeout(() => { timedOut = true; c.abort(); }, ms);
  const onAbort = () => c.abort();
  if (parent) { if (parent.aborted) c.abort(); else parent.addEventListener("abort", onAbort, { once: true }); }
  return {
    signal: c.signal,
    get timedOut() { return timedOut; },
    done() { clearTimeout(t); parent && parent.removeEventListener("abort", onAbort); },
  };
}

/** fetch + JSON with timeout, one retry for transient failures, and typed errors. */
export async function getJson(url, { signal, timeoutMs = 12000, retries = 1 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const link = linkSignal(signal, timeoutMs);
    try {
      const r = await fetch(url, { signal: link.signal });
      if (!r.ok) {
        let reason = "";
        try { reason = (await r.json()).reason || ""; } catch { /* ignore */ }
        if (r.status >= 500 && attempt < retries) continue;
        throw new ApiError("http", reason || `HTTP ${r.status}`, r.status);
      }
      return await r.json();
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if (signal && signal.aborted) throw new ApiError("aborted", "Request cancelled");
      if (attempt < retries) continue;
      if (link.timedOut) throw new ApiError("timeout", "The request timed out");
      throw new ApiError("network", "Network request failed");
    } finally {
      link.done();
    }
  }
}

/** Plain-English message for the UI. */
export function describeError(e, what = "weather data") {
  switch (e && e.kind) {
    case "timeout": return `The weather service took too long to answer while loading ${what}. Please try again.`;
    case "network": return `Couldn't reach the weather service. Check your internet connection and try again.`;
    case "http":
      return e.status === 429
        ? "The free weather API rate limit was reached. Wait a minute and retry."
        : `The weather service refused the request (${e.message}).`;
    case "data": return `The weather service returned incomplete data (${e.message}).`;
    default: return `Something went wrong while loading ${what}.`;
  }
}

export const locKey = (lat, lon) => `${(+lat).toFixed(3)},${(+lon).toFixed(3)}`;

// ---------------------------------------------------------------- geocoding
export async function searchPlaces(query, { signal } = {}) {
  const q = query.trim();
  if (q.length < 2) return [];
  const j = await getJson(withKey(`${OM_GEOCODE}?name=${encodeURIComponent(q)}&count=8&language=en&format=json`), { signal, timeoutMs: 8000 });
  return (j.results || []).map((r) => ({
    id: r.id, name: r.name, admin1: r.admin1 || "", country: r.country || "", countryCode: r.country_code || "",
    lat: r.latitude, lon: r.longitude, timezone: r.timezone || "", population: r.population || 0, source: "search",
  }));
}

/** Best-effort place name for a map click. Never throws. */
export async function reverseGeocode(lat, lon, { signal } = {}) {
  try {
    if (CFG.GEOAPIFY_KEY) {
      const j = await getJson(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&format=json&apiKey=${CFG.GEOAPIFY_KEY}`, { signal, timeoutMs: 6000, retries: 0 });
      const x = j.results && j.results[0];
      if (x) return { name: x.city || x.town || x.village || x.suburb || x.county || x.state || "", admin1: x.state || "", country: x.country || "" };
    }
    const j = await getJson(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=en&lat=${lat}&lon=${lon}`, { signal, timeoutMs: 6000, retries: 0 });
    const a = (j && j.address) || {};
    const name = a.city || a.town || a.village || a.county || a.state_district || a.state || "";
    return name ? { name, admin1: a.state || "", country: a.country || "" } : null;
  } catch { return null; }
}

// ---------------------------------------------------------------- forecast
const cache = new Map();
const TTL_MS = 15 * 60 * 1000;
export const clearCache = () => cache.clear();

/**
 * Turn an Open-Meteo response into two "days" of 24 hourly blocks.
 * Open-Meteo's shortwave_radiation is the average of the PRECEDING hour, so the block
 * [h, h+1) uses the value stamped h+1. Cloud cover and temperature are instantaneous,
 * so a block uses the mean of its two bounding stamps.
 */
export function parseForecast(j, req = {}) {
  const bad = (m) => new ApiError("data", m);
  if (j && j.error) throw new ApiError("http", j.reason || "API error");
  const H = j && j.hourly, D = j && j.daily;
  if (!H || !D) throw bad("no hourly or daily section");
  for (const k of ["time", "temperature_2m", "cloud_cover", "shortwave_radiation"])
    if (!Array.isArray(H[k]) || H[k].length < 48) throw bad(`hourly ${k} is missing`);
  if (!Array.isArray(D.time) || D.time.length < 2) throw bad("daily data is missing");

  let missing = 0, lastTemp = null;
  const n = H.time.length;
  const val = (arr, i, fallback) => {
    const v = arr[i];
    if (typeof v === "number" && isFinite(v)) return v;
    missing++;
    return fallback;
  };
  const days = [0, 1].map((di) => {
    const date = D.time[di];
    const hours = [];
    for (let k = 0; k < 24; k++) {
      const i = di * 24 + k, nx = i + 1;
      if (!String(H.time[i]).startsWith(date)) throw bad("hourly timestamps don't match daily dates");
      const ghi = nx < n ? Math.max(0, val(H.shortwave_radiation, nx, 0)) : 0;
      const c0 = val(H.cloud_cover, i, 0), c1 = nx < n ? val(H.cloud_cover, nx, c0) : c0;
      const t0 = val(H.temperature_2m, i, lastTemp ?? 25), t1 = nx < n ? val(H.temperature_2m, nx, t0) : t0;
      lastTemp = t1;
      hours.push({ h: k, ghi, cloud: (c0 + c1) / 2, temp: (t0 + t1) / 2 });
    }
    return {
      date, hours,
      sunrise: isoToHour(D.sunrise && D.sunrise[di]),
      sunset: isoToHour(D.sunset && D.sunset[di]),
      tMax: D.temperature_2m_max ? D.temperature_2m_max[di] : null,
      tMin: D.temperature_2m_min ? D.temperature_2m_min[di] : null,
    };
  });
  const c = j.current;
  return {
    source: "Open-Meteo Forecast API",
    requestedLat: req.lat, requestedLon: req.lon,
    gridLat: j.latitude, gridLon: j.longitude, elevation: j.elevation,
    timezone: j.timezone, tzAbbr: j.timezone_abbreviation, utcOffsetSec: j.utc_offset_seconds || 0,
    fetchedAt: Date.now(), missing,
    current: c ? { time: c.time, temp: c.temperature_2m, cloud: c.cloud_cover, humidity: c.relative_humidity_2m, code: c.weather_code, isDay: c.is_day === 1 } : null,
    days,
  };
}

export async function fetchSolarData(lat, lon, { signal, force = false } = {}) {
  const la = +(+lat).toFixed(3), lo = +(+lon).toFixed(3), key = locKey(la, lo);
  const hit = cache.get(key);
  if (!force && hit && Date.now() - hit.fetchedAt < TTL_MS && hit.days[0].date === localClock(hit.utcOffsetSec).date)
    return { data: hit, fromCache: true };
  const url = withKey(
    `${OM_FORECAST}?latitude=${la}&longitude=${lo}` +
    `&current=temperature_2m,relative_humidity_2m,cloud_cover,weather_code,is_day` +
    `&hourly=temperature_2m,cloud_cover,shortwave_radiation` +
    `&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min` +
    `&timezone=auto&forecast_days=2`
  );
  const j = await getJson(url, { signal });
  const data = parseForecast(j, { lat: la, lon: lo });
  cache.set(key, data);
  return { data, fromCache: false };
}

/** Optional: NASA POWER recent-average sunlight via the local backend. Null when unavailable. */
export async function fetchNasa(lat, lon, utcOffsetSec, { signal } = {}) {
  if (!CFG.BACKEND_URL) return null;
  try {
    const j = await getJson(`${CFG.BACKEND_URL}/api/nasa?lat=${lat}&lon=${lon}&utc_offset=${utcOffsetSec}`, { signal, timeoutMs: 30000, retries: 0 });
    return j && Array.isArray(j.sw) ? j : null;
  } catch { return null; }
}
