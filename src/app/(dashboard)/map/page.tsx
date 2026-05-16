"use client";
import { useState } from "react";

type SlotStatus = "available" | "occupied" | "reserved" | "disabled";
interface MapSlot { id: string; row: number; col: number; status: SlotStatus; plate?: string; since?: string; fee?: string; }

const ZONES = ["Zone A","Zone B","Zone C"];
const LEVELS = ["Level 1","Level 2","Level 3","Rooftop"];

const generateZoneSlots = (zone: string, level: string): MapSlot[] => {
  const rows = 5, cols = 10;
  return Array.from({ length: rows * cols }, (_, i) => {
    const r = Math.random();
    const status: SlotStatus = i === 12 || i === 13 || i === 34 ? "disabled"
      : r > 0.35 ? "occupied" : r > 0.12 ? "available" : "reserved";
    return {
      id: `${zone[5]}-${level[6]}${String(i + 1).padStart(2, "0")}`,
      row: Math.floor(i / cols),
      col: i % cols,
      status,
      plate: status === "occupied" ? `MH${String(Math.floor(Math.random()*99)).padStart(2,"0")}-AB-${String(Math.floor(Math.random()*9999)).padStart(4,"0")}` : undefined,
      since: status === "occupied" ? `${Math.floor(Math.random() * 120 + 5)}m ago` : undefined,
      fee: status === "occupied" ? `₹${Math.floor(Math.random() * 80 + 20)}` : undefined,
    };
  });
};

export default function MapPage() {
  const [zone,  setZone]  = useState(ZONES[0]);
  const [level, setLevel] = useState(LEVELS[0]);
  const [hovered, setHovered] = useState<MapSlot | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const slots = generateZoneSlots(zone, level);
  const occupied  = slots.filter(s => s.status === "occupied").length;
  const available = slots.filter(s => s.status === "available").length;
  const reserved  = slots.filter(s => s.status === "reserved").length;
  const pct = Math.round((occupied / (slots.length - slots.filter(s=>s.status==="disabled").length)) * 100);

  const slotColor = (s: SlotStatus) => ({
    available: { bg: "var(--green-dim)",  border: "rgba(34,197,94,0.35)",  text: "var(--green)"  },
    occupied:  { bg: "var(--red-dim)",    border: "rgba(239,68,68,0.35)",   text: "var(--red)"    },
    reserved:  { bg: "var(--amber-dim)",  border: "rgba(245,158,11,0.35)", text: "var(--amber)"  },
    disabled:  { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.05)", text: "rgba(255,255,255,0.1)" },
  }[s]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", position: "relative" }}>

      {/* ── Controls ── */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        {/* Zone tabs */}
        <div style={{ display: "flex", gap: "4px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "3px" }}>
          {ZONES.map(z => (
            <button key={z} onClick={() => setZone(z)} style={{
              padding: "0.35rem 1rem", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 600,
              border: "none", cursor: "pointer", transition: "all 0.15s",
              background: zone === z ? "var(--bg-hover)" : "transparent",
              color: zone === z ? "var(--text-primary)" : "var(--text-muted)",
            }}>{z}</button>
          ))}
        </div>

        {/* Level tabs */}
        <div style={{ display: "flex", gap: "4px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "3px" }}>
          {LEVELS.map(l => (
            <button key={l} onClick={() => setLevel(l)} style={{
              padding: "0.35rem 0.875rem", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 600,
              border: "none", cursor: "pointer", transition: "all 0.15s",
              background: level === l ? "var(--accent-dim)" : "transparent",
              color: level === l ? "var(--accent)" : "var(--text-muted)",
            }}>{l}</button>
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: "1rem" }}>
          <span className={`badge ${pct > 85 ? "badge-red" : pct > 60 ? "badge-amber" : "badge-green"}`}>{pct}% Occupied</span>
          <span className="badge badge-green">{available} Available</span>
          <span className="badge badge-amber">{reserved} Reserved</span>
        </div>
      </div>

      {/* ── Map + Sidebar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: "1.25rem" }}>

        {/* Floor Plan */}
        <div className="card" style={{ padding: "1.5rem", position: "relative" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{zone} · {level} — Floor Plan</span>
            <span>10 columns × 5 rows · {slots.length} slots</span>
          </div>

          {/* Entry / Exit markers */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", padding: "0 0.25rem" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--green)", background: "var(--green-dim)", padding: "2px 8px", borderRadius: "4px", border: "1px solid rgba(34,197,94,0.3)" }}>▶ ENTRY</div>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--red)", background: "var(--red-dim)", padding: "2px 8px", borderRadius: "4px", border: "1px solid rgba(239,68,68,0.3)" }}>EXIT ▶</div>
          </div>

          {/* Driving lane + slot grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}
          >
            {[0,1,2,3,4].map(row => (
              <div key={row} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", width: "16px", textAlign: "center", fontWeight: 600 }}>{String.fromCharCode(65+row)}</span>
                {/* Top half of row */}
                <div style={{ display: "flex", gap: "5px", flex: 1 }}>
                  {slots.filter(s => s.row === row).slice(0, 5).map(slot => {
                    const c = slotColor(slot.status);
                    return (
                      <div
                        key={slot.id}
                        onMouseEnter={() => setHovered(slot)}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                          flex: 1, height: "44px", borderRadius: "5px",
                          background: c.bg, border: `1.5px solid ${c.border}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.58rem", fontWeight: 700, color: c.text,
                          cursor: slot.status !== "disabled" ? "pointer" : "default",
                          transition: "transform 0.15s",
                        }}
                        onMouseDown={e => { (e.currentTarget as HTMLDivElement).style.transform = "scale(0.94)"; }}
                        onMouseUp={e  => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
                      >
                        {slot.status !== "disabled" ? slot.id : "—"}
                      </div>
                    );
                  })}
                </div>
                {/* Driving lane */}
                <div style={{ width: "28px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ height: "2px", width: "100%", background: "rgba(255,255,255,0.06)", position: "relative" }}>
                    <div style={{ position: "absolute", top: "-4px", left: "50%", transform: "translateX(-50%)", fontSize: "0.6rem", color: "var(--text-muted)" }}>⋯</div>
                  </div>
                </div>
                {/* Bottom half of row */}
                <div style={{ display: "flex", gap: "5px", flex: 1 }}>
                  {slots.filter(s => s.row === row).slice(5, 10).map(slot => {
                    const c = slotColor(slot.status);
                    return (
                      <div
                        key={slot.id}
                        onMouseEnter={() => setHovered(slot)}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                          flex: 1, height: "44px", borderRadius: "5px",
                          background: c.bg, border: `1.5px solid ${c.border}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.58rem", fontWeight: 700, color: c.text,
                          cursor: slot.status !== "disabled" ? "pointer" : "default",
                          transition: "transform 0.15s",
                        }}
                      >
                        {slot.status !== "disabled" ? slot.id : "—"}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="legend" style={{ marginTop: "1.25rem" }}>
            {[
              { color: "var(--green)", label: "Available" },
              { color: "var(--red)",   label: "Occupied"  },
              { color: "var(--amber)", label: "Reserved"  },
              { color: "rgba(255,255,255,0.15)", label: "Disabled" },
            ].map(l => (
              <div key={l.label} className="legend-item">
                <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: l.color, display: "inline-block" }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Zone stats */}
          <div className="card">
            <div className="section-title" style={{ marginBottom: "1rem" }}>Zone Stats</div>
            {[
              { label: "Total Slots",   val: slots.length },
              { label: "Occupied",      val: occupied,  color: "var(--red)"   },
              { label: "Available",     val: available, color: "var(--green)" },
              { label: "Reserved",      val: reserved,  color: "var(--amber)" },
              { label: "Disabled",      val: slots.filter(s=>s.status==="disabled").length, color: "var(--text-muted)" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.45rem 0", borderBottom: "1px solid var(--border)", fontSize: "0.82rem" }}>
                <span style={{ color: "var(--text-muted)" }}>{r.label}</span>
                <span style={{ fontWeight: 700, color: r.color ?? "var(--text-primary)" }}>{r.val}</span>
              </div>
            ))}
            <div style={{ marginTop: "1rem" }}>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct > 85 ? "var(--red)" : pct > 60 ? "var(--amber)" : "var(--green)" }} />
              </div>
              <div style={{ textAlign: "right", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>{pct}% occupancy</div>
            </div>
          </div>

          {/* Hover tooltip as static card */}
          {hovered && hovered.status !== "disabled" ? (
            <div className="card" style={{ animation: "fadeUp 0.15s ease both" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Slot {hovered.id}</span>
                <span className={`badge badge-${hovered.status === "available" ? "green" : hovered.status === "occupied" ? "red" : "amber"}`} style={{ fontSize: "0.68rem" }}>
                  {hovered.status}
                </span>
              </div>
              {hovered.plate && (
                <div style={{ marginBottom: "0.5rem" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "2px" }}>Plate</div>
                  <div style={{ fontFamily: "monospace", color: "var(--accent)", fontWeight: 700 }}>{hovered.plate}</div>
                </div>
              )}
              {hovered.since && (
                <div style={{ marginBottom: "0.5rem" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "2px" }}>Parked since</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{hovered.since}</div>
                </div>
              )}
              {hovered.fee && (
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "2px" }}>Current fee</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--green)" }}>{hovered.fee}</div>
                </div>
              )}
              {hovered.status === "available" && (
                <button className="btn btn-accent" style={{ marginTop: "0.875rem", width: "100%", justifyContent: "center", fontSize: "0.8rem", padding: "0.45rem" }}>
                  Reserve Slot
                </button>
              )}
            </div>
          ) : (
            <div className="card" style={{ background: "transparent", border: "1px dashed var(--border)", textAlign: "center", padding: "2rem 1rem" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Hover a slot<br />to view details</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
