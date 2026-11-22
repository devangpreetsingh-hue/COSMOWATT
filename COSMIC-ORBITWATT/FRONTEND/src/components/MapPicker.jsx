import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { CFG } from "../lib/config.js";

const geoTiles = `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${CFG.GEOAPIFY_KEY}`;
const TILES = {
  osm: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png", "© OpenStreetMap contributors"],
  satellite: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", "Imagery © Esri and contributors"],
  maptiler: [`https://api.maptiler.com/maps/hybrid/256/{z}/{x}/{y}.jpg?key=${CFG.MAPTILER_KEY}`, "© MapTiler © OpenStreetMap contributors"],
};
const tile = CFG.GEOAPIFY_KEY && CFG.MAP_STYLE === "osm" ? [geoTiles, "© Geoapify © OpenMapTiles © OpenStreetMap contributors"] : TILES[CFG.MAP_STYLE] || TILES.osm;

/** Leaflet map. Click anywhere to choose a location; the marker follows the selected location. */
export default function MapPicker({ lat, lon, onPick }) {
  const el = useRef(null), map = useRef(null), marker = useRef(null), pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    const m = L.map(el.current, { zoomControl: true }).setView([lat, lon], 7);
    L.tileLayer(tile[0], { maxZoom: 18, attribution: tile[1] }).addTo(m);
    marker.current = L.marker([lat, lon], {
      icon: L.divIcon({ className: "pin-wrap", html: '<span class="pin"></span>', iconSize: [28, 28], iconAnchor: [14, 14] }),
      keyboard: false,
    }).addTo(m);
    m.on("click", (e) => pick.current(e.latlng.lat, e.latlng.lng));
    map.current = m;
    return () => { m.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map.current) return;
    marker.current.setLatLng([lat, lon]);
    map.current.flyTo([lat, lon], Math.max(map.current.getZoom(), 7), { duration: 0.8 });
  }, [lat, lon]);

  return <div ref={el} className="map" role="application" aria-label="Map. Click to choose a location." />;
}
