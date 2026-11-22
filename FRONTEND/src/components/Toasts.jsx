import React from "react";
import { Icon } from "./ui.jsx";

export default function Toasts({ items, onClose }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast t-${t.type}`}>
          <Icon name={t.type === "error" ? "alert" : "check"} size={20} />
          <span>{t.text}</span>
          <button className="icon-btn" aria-label="Dismiss" onClick={() => onClose(t.id)}><Icon name="x" size={16} /></button>
        </div>
      ))}
    </div>
  );
}
