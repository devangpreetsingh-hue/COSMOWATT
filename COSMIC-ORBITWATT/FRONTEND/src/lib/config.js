// All settings come from .env (see .env.example). VITE_ values are public in the browser.
const E = (typeof import.meta !== "undefined" && import.meta.env) || {};
const geoKey = E.VITE_GEOAPIFY_KEY && !String(E.VITE_GEOAPIFY_KEY).startsWith("PASTE") ? E.VITE_GEOAPIFY_KEY : "";

export const CFG = {
  BACKEND_URL: String(E.VITE_BACKEND_URL || "").replace(/\/$/, ""),
  MAP_STYLE: E.VITE_MAP_STYLE || "osm",
  MAPTILER_KEY: E.VITE_MAPTILER_KEY || "",
  GEOAPIFY_KEY: geoKey,
  OPEN_METEO_API_KEY: E.VITE_OPEN_METEO_API_KEY || "",
  DEFAULT_LOCATION: {
    name: E.VITE_DEFAULT_NAME || "Bhopal",
    admin1: "",
    country: "",
    lat: +(E.VITE_DEFAULT_LAT || 23.26),
    lon: +(E.VITE_DEFAULT_LON || 77.41),
    source: "default",
  },
};
