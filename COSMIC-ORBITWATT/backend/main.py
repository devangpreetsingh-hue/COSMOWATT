"""ORBITWATT backend: NASA POWER + INSAT-3D (MOSDAC) helpers.  Run: uvicorn main:app --reload --port 8000"""
import os
from datetime import date, timedelta
from functools import lru_cache
from pathlib import Path

import h5py
import numpy as np
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
app = FastAPI(title="ORBITWATT backend")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","), allow_methods=["*"], allow_headers=["*"])
DATA_DIR = Path(os.getenv("INSAT_DATA_DIR", "data/insat"))


@app.get("/api/health")
def health():
    return {"ok": True}


@lru_cache(maxsize=64)
def _nasa(lat: float, lon: float, end: str, days: int):
    end_d = date.fromisoformat(end)
    start_d = end_d - timedelta(days=days - 1)
    params = {"parameters": "ALLSKY_SFC_SW_DWN", "community": "RE", "longitude": lon, "latitude": lat,
              "start": start_d.strftime("%Y%m%d"), "end": end_d.strftime("%Y%m%d"),
              "format": "JSON", "time-standard": "utc"}
    r = requests.get("https://power.larc.nasa.gov/api/temporal/hourly/point", params=params, timeout=60)
    r.raise_for_status()
    series = r.json()["properties"]["parameter"]["ALLSKY_SFC_SW_DWN"]
    buckets = [[] for _ in range(24)]
    for key, v in series.items():            # key looks like YYYYMMDDHH
        if v is not None and v > -900:       # POWER marks missing data as -999
            buckets[int(key[8:10])].append(v)
    utc = [sum(b) / len(b) if b else 0.0 for b in buckets]
    ist = [(utc[(h - 6) % 24] + utc[(h - 5) % 24]) / 2 for h in range(24)]   # UTC to IST (+5.5 h)
    return {"sw": [round(x, 1) for x in ist], "start": str(start_d), "end": str(end_d),
            "note": "NASA POWER hourly all-sky sunlight, average of recent days, converted to IST"}


@app.get("/api/nasa")
def nasa(lat: float, lon: float, days: int = 7):
    """Average sunlight by IST hour over recent days. POWER lags real time, so we stop 3 days back."""
    try:
        return _nasa(round(lat, 1), round(lon, 1), str(date.today() - timedelta(days=3)), days)
    except Exception as e:
        raise HTTPException(502, f"NASA POWER request failed: {e}")


def _newest():
    files = sorted(DATA_DIR.glob("*.h5"), key=lambda p: p.stat().st_mtime)
    if not files:
        raise HTTPException(404, f"No .h5 file in {DATA_DIR}. Download one with MOSDAC mdapi.py first (see README).")
    return files[-1]


@app.get("/api/insat/inspect")
def insat_inspect():
    """Lists every dataset in the newest INSAT file. Use it to fill the INSAT_* names in .env."""
    f = _newest()
    out = {}
    with h5py.File(f) as h:
        h.visititems(lambda n, o: out.__setitem__(n, {"shape": list(o.shape), "dtype": str(o.dtype)}) if isinstance(o, h5py.Dataset) else None)
    return {"file": f.name, "datasets": out}


@app.get("/api/insat")
def insat(lat: float, lon: float):
    """Latest INSAT-3D value at the pixel nearest your roof."""
    names = [os.getenv(k) for k in ("INSAT_VALUE_DATASET", "INSAT_LAT_DATASET", "INSAT_LON_DATASET")]
    if not all(names):
        raise HTTPException(501, "Set INSAT_VALUE_DATASET, INSAT_LAT_DATASET and INSAT_LON_DATASET in .env. Find the names at /api/insat/inspect.")
    f = _newest()
    with h5py.File(f) as h:
        vd, la, lo = h[names[0]], h[names[1]][:], h[names[2]][:]
        if la.ndim == 1:
            i, j = int(np.abs(la - lat).argmin()), int(np.abs(lo - lon).argmin())
        else:
            i, j = np.unravel_index((np.abs(la - lat) + np.abs(lo - lon)).argmin(), la.shape)
        raw = np.squeeze(vd[...])[i, j]
        fill = vd.attrs.get("_FillValue")
        v = float(raw) * float(vd.attrs.get("scale_factor", 1)) + float(vd.attrs.get("add_offset", 0))
        if not np.isfinite(v) or (fill is not None and raw == np.squeeze(fill)):
            raise HTTPException(404, "No valid INSAT value here (cloud mask, night or outside the scan).")
    return {"value": v, "units": os.getenv("INSAT_UNITS", ""), "file": f.name}
