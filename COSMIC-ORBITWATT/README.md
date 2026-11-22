# ORBITWATT v0.4

Pick your roof on a real map, set your panels and appliances, and get a live countdown to your next free-power window.
Vite + React shell. Page markup is in `src/app/markup.js`, logic in `src/app/main.js`, styles in `src/styles.css`.
Your intro video is kept: click "Watch intro video" in the header (`public/media/ORBITWATT-intro.mp4`).

## Run
1. Install Node.js (recent version).
2. `npm install`
3. Copy `.env.example` to `.env` (Windows: `copy .env.example .env`)
4. `npm run dev`, then open the localhost address Vite prints.

The top-right text should say "Live data: Open-Meteo". Map, place search and GPS work with no keys.

## Where API keys go
| Service | Key? | Where |
|---|---|---|
| Open-Meteo | Not for free non-commercial use | `VITE_OPEN_METEO_API_KEY` in `.env` (paid plan only) |
| OpenStreetMap, Esri imagery | No | `VITE_MAP_STYLE` in `.env` |
| MapTiler | Optional free key | `VITE_MAPTILER_KEY` in `.env` |
| NASA POWER | No | backend `/api/nasa` |
| INSAT-3D (MOSDAC) | Free account | `backend/mosdac/config.json` |

`VITE_` values are public. Passwords and private keys go only in `backend/`.

## Optional backend (NASA POWER and INSAT-3D)
```
cd backend
python -m venv .venv
.venv\Scripts\activate        # Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env        # Mac/Linux: cp .env.example .env
uvicorn main:app --reload --port 8000
```
Then set `VITE_BACKEND_URL=http://localhost:8000` in the root `.env` and restart `npm run dev`.
For INSAT-3D, follow `backend/mosdac/README.txt`, then open `/api/insat/inspect` and copy the dataset names into `backend/.env`.

## Limits
The forecast is a simplified estimate: sunlight x panel kW x 0.8 efficiency, with a 15% safety margin. It ignores roof tilt, shading, temperature and real household demand. Open-Meteo is a weather model, not raw satellite telemetry. Times are IST.

## v0.5 changes
- **Root cause of the "dataset never changes" bug:** `setLoc()` in the old `src/app/main.js` assigned an undeclared variable (`lockT = performance.now()`). In an ES module that throws a `ReferenceError`, which aborted the function after the name/coordinates were stored but *before* the map, the refetch (`live()`) and the render ran. The UI was rewritten as React components, so this class of bug is gone.
- New data pipeline: `src/lib/api.js` (geocoding, forecast, 15-min cache keyed by coordinates), `src/hooks/useSolarData.js` (clears old data on location change, aborts the previous request, ignores stale responses), `src/lib/solar.js` + `src/lib/schedule.js` (estimates, scheduler, analytics).
- Sunrise/sunset, clock and countdown use the selected location's own UTC offset.
- Logic check: `node tests/logic.test.mjs` (synthetic fixture, not real weather data).

## Known gaps
- Not verified against the live Open-Meteo APIs or in a real browser/Vite build (the build sandbox had no internet). Run `npm install && npm run dev` and test Ahmedabad, Jaipur, Mumbai and Delhi yourself.
- Battery storage is not modeled. The optional backend's NASA POWER conversion still assumes IST.

## Combined with COSMIC
`index.html` is the COSMIC front page (BEGIN JOURNEY / ORBITWATT). The ORBITWATT button opens `orbitwatt.html`, a prebuilt copy of the ORBITWATT app (`orbitwatt-app/`). Double-click `index.html` to use it; no npm needed (internet is needed for the map, three.js and weather data). The original React source stays in `src/`.
