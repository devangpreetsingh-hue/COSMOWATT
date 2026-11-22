// Appliance presets. `mode: "fixed"` runs at exactly winStart; "flexible" may start any time
// so that the whole run fits inside [winStart, winEnd].
export const APPLIANCE_TYPES = [
  { type: "ac", label: "Air conditioner", icon: "❄️", kw: 1.5, hours: 3, winStart: 10, winEnd: 17, priority: 2, mode: "flexible" },
  { type: "dishwasher", label: "Dishwasher", icon: "🍽️", kw: 1.2, hours: 2, winStart: 9, winEnd: 17, priority: 3, mode: "flexible" },
  { type: "pump", label: "Water pump", icon: "💧", kw: 0.75, hours: 2, winStart: 8, winEnd: 17, priority: 1, mode: "flexible" },
  { type: "washer", label: "Washing machine", icon: "🧺", kw: 0.5, hours: 2, winStart: 9, winEnd: 17, priority: 3, mode: "flexible" },
  { type: "heater", label: "Water heater", icon: "🚿", kw: 2, hours: 1, winStart: 8, winEnd: 16, priority: 2, mode: "flexible" },
  { type: "ev", label: "EV charger", icon: "🚗", kw: 3.3, hours: 3, winStart: 9, winEnd: 17, priority: 3, mode: "flexible" },
  { type: "cooktop", label: "Induction cooktop", icon: "🍳", kw: 1.8, hours: 1, winStart: 12, winEnd: 13, priority: 2, mode: "fixed" },
  { type: "fans", label: "Ceiling fans", icon: "🌀", kw: 0.25, hours: 6, winStart: 9, winEnd: 17, priority: 2, mode: "flexible" },
  { type: "iron", label: "Iron", icon: "👔", kw: 1, hours: 1, winStart: 10, winEnd: 16, priority: 3, mode: "flexible" },
  { type: "custom", label: "Custom appliance", icon: "🔌", kw: 1, hours: 2, winStart: 9, winEnd: 17, priority: 3, mode: "flexible" },
];
export const typeInfo = (t) => APPLIANCE_TYPES.find((x) => x.type === t) || APPLIANCE_TYPES[APPLIANCE_TYPES.length - 1];

let seq = 0;
export function makeAppliance(type, overrides = {}) {
  const t = typeInfo(type);
  return {
    id: `a${Date.now().toString(36)}${(seq++).toString(36)}`,
    type: t.type, name: t.label, kw: t.kw, hours: t.hours, winStart: t.winStart, winEnd: t.winEnd,
    priority: t.priority, mode: t.mode, enabled: true, ...overrides,
  };
}
export const DEFAULT_APPLIANCES = () => ["ac", "dishwasher", "pump", "washer"].map((t) => makeAppliance(t));
export const DEFAULT_PREFS = { panelKw: 4, baseLoadKw: 0.4, margin: 0.15, tariff: 8 };
export const PRIORITY_LABEL = { 1: "High", 2: "Medium", 3: "Low" };
