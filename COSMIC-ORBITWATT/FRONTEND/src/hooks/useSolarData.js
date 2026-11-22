import { useCallback, useEffect, useRef, useState } from "react";
import { CFG } from "../lib/config.js";
import { fetchSolarData, fetchNasa, locKey, describeError } from "../lib/api.js";
import { localClock } from "../lib/time.js";

const EMPTY = { status: "idle", data: null, key: null, error: null, fromCache: false, refreshing: false, extra: null };

/**
 * Loads weather + solar data for `location` whenever its coordinates change.
 *
 * Guarantees:
 *  - switching to a different place clears the old dataset immediately (data = null),
 *    so one city's numbers are never shown under another city's name;
 *  - the previous in-flight request is aborted, and a request id check stops a slow,
 *    outdated response from overwriting a newer selection;
 *  - errors never leave the previous city's data behind.
 */
export function useSolarData(location, notify) {
  const [state, setState] = useState(EMPTY);
  const reqId = useRef(0), ctrl = useRef(null), keyRef = useRef(null), locRef = useRef(location), notifyRef = useRef(notify);
  locRef.current = location; notifyRef.current = notify;

  const load = useCallback(async (loc, { force = false } = {}) => {
    const key = locKey(loc.lat, loc.lon);
    const same = keyRef.current === key;
    if (ctrl.current) ctrl.current.abort();
    const c = new AbortController();
    ctrl.current = c;
    const id = ++reqId.current;
    keyRef.current = key;
    setState((s) => ({
      status: "loading", key, error: null, fromCache: false,
      data: same ? s.data : null, extra: same ? s.extra : null, refreshing: same && !!s.data,
    }));
    try {
      const { data, fromCache } = await fetchSolarData(loc.lat, loc.lon, { signal: c.signal, force });
      if (id !== reqId.current) return; // a newer selection superseded this one
      setState((s) => ({ ...s, status: "ready", data, key, error: null, fromCache, refreshing: false }));
      notifyRef.current && notifyRef.current({ type: "success", text: `Loaded ${fromCache ? "saved " : "live "}solar data for ${locRef.current.name}.` });
      if (CFG.BACKEND_URL) {
        fetchNasa(loc.lat, loc.lon, data.utcOffsetSec, { signal: c.signal }).then((extra) => {
          if (id === reqId.current) setState((s) => ({ ...s, extra }));
        });
      }
    } catch (e) {
      if (id !== reqId.current || (e && e.kind === "aborted")) return;
      setState((s) => ({ ...s, status: "error", error: e, refreshing: false }));
      notifyRef.current && notifyRef.current({ type: "error", text: describeError(e) });
    }
  }, []);

  // Location changed -> fetch for the NEW coordinates.
  useEffect(() => { load(location); }, [location.lat, location.lon, load]);
  useEffect(() => () => { if (ctrl.current) ctrl.current.abort(); reqId.current++; }, []);

  // The location's calendar day rolled over while the page was open -> refresh.
  useEffect(() => {
    const iv = setInterval(() => {
      const s = stateRef.current;
      if (s.data && s.status !== "loading" && localClock(s.data.utcOffsetSec).date !== s.data.days[0].date) load(locRef.current, { force: true });
    }, 60000);
    return () => clearInterval(iv);
  }, [load]);
  const stateRef = useRef(state);
  stateRef.current = state;

  const refresh = useCallback(() => load(locRef.current, { force: true }), [load]);
  return { ...state, refresh };
}
