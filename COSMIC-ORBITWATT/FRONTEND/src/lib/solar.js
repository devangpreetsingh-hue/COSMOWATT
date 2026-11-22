// Solar generation model. Inputs come from the weather API; the conversion to kW is an ESTIMATE.
export const SYSTEM_EFFICIENCY = 0.86; // inverter, wiring, soiling and mismatch losses
export const TEMP_COEFF = -0.004;      // power change per °C of cell temperature above 25 °C
export const CELL_RISE = 0.031;        // °C of cell heating per W/m² (typical NOCT behaviour)

/** Estimated AC output (kW) of a panel array for one hour. */
export function pvKw(ghi, tempC, panelKw) {
  if (!(ghi > 0) || !(panelKw > 0)) return 0;
  const cell = tempC + CELL_RISE * ghi;
  const tempFactor = Math.max(0.6, 1 + TEMP_COEFF * (cell - 25));
  return panelKw * (ghi / 1000) * SYSTEM_EFFICIENCY * tempFactor;
}
export const pvSeries = (day, panelKw) => day.hours.map((x) => pvKw(x.ghi, x.temp, panelKw));
export const sum = (a) => a.reduce((s, v) => s + v, 0);
/** Total horizontal irradiation for the day in kWh/m². */
export const irradiationKwhM2 = (day) => sum(day.hours.map((x) => x.ghi)) / 1000;

/** Contiguous run of hours around the maximum that stay within `frac` of the peak. */
export function peakRun(series, frac = 0.8) {
  const max = Math.max(0, ...series);
  if (max <= 0) return null;
  const m = series.indexOf(max);
  let a = m, b = m;
  while (a > 0 && series[a - 1] >= frac * max) a--;
  while (b < series.length - 1 && series[b + 1] >= frac * max) b++;
  return { start: a, end: b + 1, peakKw: max, peakHour: m };
}

/** Hour range [lo, hi) worth drawing on charts for this day. */
export function chartRange(day) {
  const lit = day.hours.filter((x) => x.ghi > 5).map((x) => x.h);
  let lo = lit.length ? Math.min(...lit) - 1 : 5, hi = lit.length ? Math.max(...lit) + 2 : 20;
  lo = Math.max(0, lo); hi = Math.min(24, hi);
  while (hi - lo < 10) { if (lo > 0) lo--; if (hi - lo < 10 && hi < 24) hi++; }
  return [lo, hi];
}
