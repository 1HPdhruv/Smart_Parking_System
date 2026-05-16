"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export function Header({ title = "Live Dashboard" }: { title?: string }) {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
      setDate(now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="dashboard-header">
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <div>
          <div className="header-title">{title}</div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>{date}</div>
        </div>
        {/* Live Clock */}
        <div style={{
          fontFamily: "'Courier New', monospace",
          fontSize: "1rem",
          fontWeight: 700,
          color: "var(--accent)",
          background: "var(--accent-dim)",
          border: "1px solid rgba(79,110,247,0.2)",
          borderRadius: "var(--radius-md)",
          padding: "0.3rem 0.75rem",
          letterSpacing: "0.08em",
          lineHeight: 1,
        }}>
          {time}
        </div>
      </div>

      <div className="header-actions">
        {/* Search */}
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "0.9rem", pointerEvents: "none" }}>⌕</span>
          <input
            className="input"
            placeholder="Search plates, zones..."
            style={{ paddingLeft: "2.2rem", width: "220px", height: "36px", fontSize: "0.82rem" }}
          />
        </div>

        {/* Notification */}
        <button className="icon-btn notification-btn" style={{ position: "relative" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="notif-badge" />
        </button>

        <div className="divider" />

        {/* Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer" }}>
          <div className="avatar">OP</div>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>Operator</div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Admin · Zone A</div>
          </div>
        </div>
      </div>
    </header>
  );
}
