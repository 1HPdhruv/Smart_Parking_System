"use client";
import { useState, useMemo } from "react";

interface ANPREvent {
  id: string; plate: string; zone: string; level: string;
  entry: string; exit: string | null; duration: string | null; fee: string | null;
  action: "ACTIVE" | "COMPLETED"; type: "regular" | "blocked" | "whitelisted";
}

const RAW_EVENTS: ANPREvent[] = [
  { id:"1",  plate:"MH12-AB-4521", zone:"Zone A", level:"L1", entry:"09:14", exit:"11:02", duration:"1h 48m", fee:"₹162", action:"COMPLETED", type:"regular" },
  { id:"2",  plate:"DL03-XZ-9910", zone:"Zone B", level:"L2", entry:"10:30", exit:null,    duration:null,     fee:null,   action:"ACTIVE",    type:"regular" },
  { id:"3",  plate:"KA01-CD-1234", zone:"Zone A", level:"L1", entry:"08:00", exit:"09:45", duration:"1h 45m", fee:"₹157", action:"COMPLETED", type:"whitelisted" },
  { id:"4",  plate:"TN22-EF-7890", zone:"Zone C", level:"L3", entry:"11:15", exit:"12:00", duration:"45m",   fee:"₹68",  action:"COMPLETED", type:"regular" },
  { id:"5",  plate:"GJ05-PQ-3345", zone:"Zone B", level:"L1", entry:"07:45", exit:null,    duration:null,     fee:null,   action:"ACTIVE",    type:"blocked"  },
  { id:"6",  plate:"RJ14-MN-8821", zone:"Zone A", level:"L2", entry:"13:00", exit:"14:30", duration:"1h 30m", fee:"₹135", action:"COMPLETED", type:"regular" },
  { id:"7",  plate:"UP32-YZ-5512", zone:"Zone C", level:"L2", entry:"09:00", exit:"10:15", duration:"1h 15m", fee:"₹113", action:"COMPLETED", type:"regular" },
  { id:"8",  plate:"HR26-GH-0099", zone:"Zone A", level:"L1", entry:"12:30", exit:null,    duration:null,     fee:null,   action:"ACTIVE",    type:"regular" },
  { id:"9",  plate:"MH12-AB-4521", zone:"Zone A", level:"L1", entry:"07:00", exit:"08:50", duration:"1h 50m", fee:"₹165", action:"COMPLETED", type:"regular" },
  { id:"10", plate:"DL03-XZ-9910", zone:"Zone C", level:"L3", entry:"06:30", exit:"07:20", duration:"50m",   fee:"₹75",  action:"COMPLETED", type:"regular" },
];

const BLOCKLIST = [
  { plate:"GJ05-PQ-3345", reason:"Unpaid dues", since:"May 10, 2025" },
  { plate:"WB20-CD-1111", reason:"Stolen vehicle", since:"Apr 3, 2025"  },
];

const WHITELIST = [
  { plate:"KA01-CD-1234", name:"Facility Staff",   since:"Jan 1, 2025" },
  { plate:"MH01-AA-0001", name:"Emergency Services", since:"Jan 1, 2025" },
];

export default function VehiclesPage() {
  const [search, setSearch]   = useState("");
  const [tab, setTab]         = useState<"log"|"blocklist"|"whitelist">("log");
  const [selected, setSelected] = useState<ANPREvent | null>(null);

  const filtered = useMemo(() =>
    RAW_EVENTS.filter(e =>
      e.plate.toLowerCase().includes(search.toLowerCase()) ||
      e.zone.toLowerCase().includes(search.toLowerCase())
    ), [search]);

  const typeColor = (t: ANPREvent["type"]) =>
    t === "blocked" ? "badge-red" : t === "whitelisted" ? "badge-accent" : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* ── Summary Cards ── */}
      <div className="grid-metrics">
        {[
          { label: "Total Events Today", value: "460",  trend: "+8.7%",  up: true  },
          { label: "Active Sessions",    value: "3",    trend: "Live",    up: true  },
          { label: "Blocked Vehicles",   value: "2",    trend: "Alert",   up: false },
          { label: "Whitelisted",        value: "12",   trend: "No fee",  up: true  },
        ].map((m, i) => (
          <div key={i} className="metric-card">
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{ fontSize: "1.8rem" }}>{m.value}</div>
            <div className={`metric-trend ${m.up ? "up" : "down"}`}>{m.up ? "↑" : "↓"} {m.trend}</div>
          </div>
        ))}
      </div>

      {/* ── Main Panel ── */}
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 320px" : "1fr", gap: "1.25rem" }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {/* Toolbar */}
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: "4px", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", padding: "3px" }}>
              {(["log","blocklist","whitelist"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: "0.3rem 0.875rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600,
                  border: "none", cursor: "pointer", transition: "all 0.15s",
                  background: tab === t ? "var(--bg-hover)" : "transparent",
                  color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
                }}>
                  {t === "log" ? "ANPR Log" : t === "blocklist" ? "Blocklist" : "Whitelist"}
                </button>
              ))}
            </div>

            {tab === "log" && (
              <input
                className="input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search plate or zone..."
                style={{ width: "220px", height: "36px", fontSize: "0.82rem" }}
              />
            )}
            <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-ghost" style={{ fontSize: "0.78rem", padding: "0.35rem 0.875rem" }}>↑ Export CSV</button>
              {tab === "blocklist" && <button className="btn btn-accent" style={{ fontSize: "0.78rem", padding: "0.35rem 0.875rem" }}>+ Add to Block</button>}
              {tab === "whitelist" && <button className="btn btn-accent" style={{ fontSize: "0.78rem", padding: "0.35rem 0.875rem" }}>+ Add to Allow</button>}
            </div>
          </div>

          {/* ANPR Log Table */}
          {tab === "log" && (
            <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Plate</th><th>Zone</th><th>Entry</th><th>Exit</th>
                    <th>Duration</th><th>Fee</th><th>Status</th><th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} onClick={() => setSelected(selected?.id === e.id ? null : e)} style={{ cursor: "pointer" }}>
                      <td><span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--accent)" }}>{e.plate}</span></td>
                      <td><span style={{ fontSize: "0.8rem" }}>{e.zone} · {e.level}</span></td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{e.entry}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.85rem", color: e.exit ? "var(--text-primary)" : "var(--text-muted)" }}>{e.exit ?? "—"}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{e.duration ?? <span className="dot dot-green pulse" style={{display:"inline-block"}}/>}</td>
                      <td style={{ color: "var(--green)", fontWeight: 600 }}>{e.fee ?? "—"}</td>
                      <td><span className={`badge ${e.action === "ACTIVE" ? "badge-green" : ""}`} style={{ fontSize: "0.68rem", background: e.action === "ACTIVE" ? "var(--green-dim)" : "var(--bg-hover)", color: e.action === "ACTIVE" ? "var(--green)" : "var(--text-muted)", borderColor: e.action === "ACTIVE" ? "rgba(34,197,94,0.25)" : "var(--border)" }}>{e.action}</span></td>
                      <td>{e.type !== "regular" ? <span className={`badge ${typeColor(e.type)}`} style={{ fontSize: "0.65rem" }}>{e.type}</span> : <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>regular</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Blocklist */}
          {tab === "blocklist" && (
            <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
              <table>
                <thead><tr><th>Plate</th><th>Reason</th><th>Blocked Since</th><th>Actions</th></tr></thead>
                <tbody>
                  {BLOCKLIST.map(b => (
                    <tr key={b.plate}>
                      <td><span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--red)" }}>{b.plate}</span></td>
                      <td style={{ color: "var(--text-secondary)" }}>{b.reason}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{b.since}</td>
                      <td><button className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "0.25rem 0.625rem", color: "var(--red)", borderColor: "rgba(239,68,68,0.3)" }}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Whitelist */}
          {tab === "whitelist" && (
            <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
              <table>
                <thead><tr><th>Plate</th><th>Name / Role</th><th>Since</th><th>Actions</th></tr></thead>
                <tbody>
                  {WHITELIST.map(w => (
                    <tr key={w.plate}>
                      <td><span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--accent)" }}>{w.plate}</span></td>
                      <td style={{ color: "var(--text-secondary)" }}>{w.name}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{w.since}</td>
                      <td><button className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "0.25rem 0.625rem", color: "var(--red)", borderColor: "rgba(239,68,68,0.3)" }}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Vehicle detail drawer */}
        {selected && (
          <div className="card" style={{ animation: "fadeUp 0.2s ease both" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "0.95rem" }}>Session Detail</h3>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1rem", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: "1.4rem", fontWeight: 800, color: "var(--accent)", marginBottom: "1rem", letterSpacing: "0.05em" }}>
              {selected.plate}
            </div>
            {[
              { l: "Zone",     v: `${selected.zone} · ${selected.level}` },
              { l: "Entry",    v: selected.entry },
              { l: "Exit",     v: selected.exit ?? "Still Active" },
              { l: "Duration", v: selected.duration ?? "Ongoing" },
              { l: "Fee",      v: selected.fee ?? "Accruing..." },
              { l: "Status",   v: selected.action },
              { l: "Type",     v: selected.type },
            ].map(row => (
              <div key={row.l} style={{ display: "flex", justifyContent: "space-between", padding: "0.55rem 0", borderBottom: "1px solid var(--border)", fontSize: "0.83rem" }}>
                <span style={{ color: "var(--text-muted)" }}>{row.l}</span>
                <span style={{ fontWeight: 600 }}>{row.v}</span>
              </div>
            ))}
            <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button className="btn btn-ghost" style={{ justifyContent: "center", fontSize: "0.82rem" }}>View Full History</button>
              <button className="btn btn-ghost" style={{ justifyContent: "center", fontSize: "0.82rem", color: "var(--red)", borderColor: "rgba(239,68,68,0.3)" }}>Add to Blocklist</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
