import React from "react";
import { Icon } from "./ui.jsx";

const STEPS = [
  ["location", "Select location"], ["conditions", "Load solar data"], ["appliances", "Add appliances"],
  ["preferences", "Set preferences"], ["schedule", "Generate schedule"], ["insights", "View insights"],
];

export default function Stepper({ done }) {
  const active = done.findIndex((d) => !d);
  return (
    <nav className="stepper" aria-label="Setup steps">
      <ol>
        {STEPS.map(([id, label], i) => {
          const isDone = done[i], isActive = i === (active === -1 ? STEPS.length - 1 : active);
          return (
            <li key={id} className={`${isDone ? "done" : ""} ${isActive ? "active" : ""}`}>
              <a href={`#${id}`} onClick={(e) => { e.preventDefault(); const el = document.getElementById(id); el && el.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                <span className="dot">{isDone ? <Icon name="check" size={16} /> : i + 1}</span><span className="lab">{label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
