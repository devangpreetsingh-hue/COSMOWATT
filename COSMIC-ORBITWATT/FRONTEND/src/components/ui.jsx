import React from "react";

const P = {
  pin: "M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 1v3 M12 20v3 M4.2 4.2l2.1 2.1 M17.7 17.7l2.1 2.1 M1 12h3 M20 12h3 M4.2 19.8l2.1-2.1 M17.7 6.3l2.1-2.1",
  cloud: "M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9.5 4 4 0 0 1 17.5 18H7z",
  thermo: "M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3",
  plus: "M12 5v14 M5 12h14",
  trash: "M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v6 M14 11v6",
  refresh: "M20 11a8 8 0 0 0-14.5-4M4 4v4h4 M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v5 M12 8h.01",
  check: "M5 13l4 4L19 7",
  alert: "M12 3 2 20h20L12 3z M12 10v4 M12 17h.01",
  sunrise: "M12 9a4 4 0 0 0-4 4h8a4 4 0 0 0-4-4z M12 3v3 M3 18h18 M4.9 8.9l1.6 1.6 M19.1 8.9l-1.6 1.6 M8 6l4-3 4 3",
  sunset: "M12 9a4 4 0 0 0-4 4h8a4 4 0 0 0-4-4z M12 6V3 M3 18h18 M4.9 8.9l1.6 1.6 M19.1 8.9l-1.6 1.6 M8 3l4 3 4-3",
  gps: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v3 M12 19v3 M2 12h3 M19 12h3",
  play: "M8 5v14l11-7L8 5z",
  leaf: "M5 19C5 9 11 4 20 4c0 9-5 15-15 15z M5 19c3-5 6-8 11-11",
  x: "M6 6l12 12 M18 6 6 18",
};
export function Icon({ name, size = 20, className = "" }) {
  return (
    <svg className={`ic ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] || P.info} />
    </svg>
  );
}

/** Help tooltip: works on hover, keyboard focus and tap. */
export function Info({ text }) {
  return (
    <span className="tip" tabIndex={0} role="img" aria-label={text}>
      <Icon name="info" size={16} />
      <span className="tip-box" role="tooltip">{text}</span>
    </span>
  );
}

/** Marks whether a number is real API data, an estimate, or the user's own input. */
export function Badge({ kind }) {
  const m = { live: ["Live API data", "b-live"], est: ["Estimate", "b-est"], input: ["Your input", "b-input"] }[kind];
  return <span className={`badge ${m[1]}`}>{m[0]}</span>;
}

export function Skeleton({ h = 20, w = "100%", r = 8 }) {
  return <span className="skel" style={{ height: h, width: w, borderRadius: r }} />;
}

export function Card({ id, step, title, help, right, children, className = "" }) {
  return (
    <section id={id} className={`card ${className}`}>
      <header className="card-h">
        <div className="card-t">
          {step ? <b className="stepno">{step}</b> : null}
          <div><h2>{title}</h2>{help ? <p className="help">{help}</p> : null}</div>
        </div>
        {right ? <div className="card-r">{right}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function Empty({ icon = "sun", title, text, action }) {
  return (
    <div className="empty">
      <Icon name={icon} size={32} />
      <b>{title}</b>
      {text ? <p>{text}</p> : null}
      {action}
    </div>
  );
}
