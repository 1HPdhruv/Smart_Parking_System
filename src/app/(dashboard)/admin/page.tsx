"use client";
import { useState } from "react";

const OPERATORS = [
  { id:"1", name:"Rahul Sharma",   email:"rahul@parker.io",  role:"Admin",    zones:"All",    status:"Active",   lastSeen:"Now" },
  { id:"2", name:"Priya Mehta",    email:"priya@parker.io",  role:"Operator", zones:"Zone A", status:"Active",   lastSeen:"5m ago" },
  { id:"3", name:"Arjun Singh",    email:"arjun@parker.io",  role:"Operator", zones:"Zone B", status:"Active",   lastSeen:"12m ago" },
  { id:"4", name:"Sneha Patel",    email:"sneha@parker.io",  role:"Viewer",   zones:"Zone C", status:"Inactive", lastSeen:"2d ago" },
  { id:"5", name:"Vikram Nair",    email:"vikram@parker.io", role:"Operator", zones:"Zone A,B",status:"Active",  lastSeen:"1h ago" },
];

const SENSORS = [
  { id:"SNS-A01", zone:"Zone A", type:"Ground",  battery: 87, status:"OK",      lastPing:"2s ago" },
  { id:"SNS-A02", zone:"Zone A", type:"Ground",  battery: 34, status:"Warning", lastPing:"8s ago" },
  { id:"SNS-B01", zone:"Zone B", type:"Ground",  battery: 92, status:"OK",      lastPing:"1s ago" },
  { id:"SNS-B02", zone:"Zone B", type:"ANPR Cam",battery: null, status:"OK",    lastPing:"4s ago" },
  { id:"SNS-C01", zone:"Zone C", type:"Ground",  battery: 12, status:"Offline", lastPing:"2m ago" },
  { id:"SNS-C02", zone:"Zone C", type:"Ground",  battery: 78, status:"OK",      lastPing:"3s ago" },
];

const ALERTS = [
  { name:"Zone C Overload", condition:"If Zone C occupancy > 90%", action:"Notify all operators", enabled: true  },
  { name:"Sensor Offline",  condition:"If any sensor offline > 5m", action:"Email admin",         enabled: true  },
  { name:"Revenue Target",  condition:"If daily revenue < ₹30,000", action:"Notify Rahul Sharma", enabled: false },
];

const LOGS = [
  { time:"14:32:10", level:"INFO",  message:"Operator Priya logged in from 192.168.1.42" },
  { time:"14:28:55", level:"WARN",  message:"Sensor SNS-C01 went offline" },
  { time:"14:15:00", level:"INFO",  message:"Tariff updated: Zone A peak rate changed" },
  { time:"13:50:22", level:"ERROR", message:"Barrier B2 failed to open — manual override triggered" },
  { time:"13:10:04", level:"INFO",  message:"System backup completed successfully" },
  { time:"12:00:00", level:"INFO",  message:"Daily occupancy report generated" },
];

const ZONES_CONFIG = [
  { name:"Zone A", capacity:48, level:"3 levels", pricing:"Standard", barrier:"Active",  status:"Open" },
  { name:"Zone B", capacity:60, level:"2 levels", pricing:"Peak",     barrier:"Active",  status:"Open" },
  { name:"Zone C", capacity:30, level:"1 level",  pricing:"Standard", barrier:"Offline", status:"Limited" },
];

export default function AdminPage() {
  const [tab, setTab] = useState<"operators"|"zones"|"sensors"|"alerts"|"logs">("operators");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* ── Tab Bar ── */}
      <div style={{ display: "flex", gap: "4px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "3px", alignSelf: "flex-start" }}>
        {(["operators","zones","sensors","alerts","logs"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "0.4rem 1rem", borderRadius: "8px", fontSize: "0.82rem", fontWeight: 600,
            border: "none", cursor: "pointer", transition: "all 0.15s", textTransform: "capitalize",
            background: tab === t ? "var(--bg-hover)" : "transparent",
            color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
          }}>
            {t === "logs" ? "System Logs" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Operators ── */}
      {tab === "operators" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="section-title">Operator Accounts</span>
            <button className="btn btn-accent" style={{ fontSize: "0.8rem", padding: "0.4rem 1rem" }}>+ Add Operator</button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--bg-elevated)" }}>
              <tr>
                {["Name","Email","Role","Zones","Status","Last Seen","Actions"].map(h => (
                  <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {OPERATORS.map(op => (
                <tr key={op.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.875rem 1rem", fontWeight: 600, color: "var(--text-primary)", fontSize: "0.85rem" }}>{op.name}</td>
                  <td style={{ padding: "0.875rem 1rem", color: "var(--text-muted)", fontSize: "0.82rem" }}>{op.email}</td>
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <span className={`badge ${op.role === "Admin" ? "badge-accent" : op.role === "Viewer" ? "" : "badge-green"}`}
                      style={{ fontSize: "0.68rem", ...(op.role === "Viewer" ? { background: "var(--bg-hover)", color: "var(--text-muted)", borderColor: "var(--border)" } : {}) }}>
                      {op.role}
                    </span>
                  </td>
                  <td style={{ padding: "0.875rem 1rem", fontSize: "0.82rem", color: "var(--text-secondary)" }}>{op.zones}</td>
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <span className={`badge ${op.status === "Active" ? "badge-green" : "badge-red"}`} style={{ fontSize: "0.68rem" }}>{op.status}</span>
                  </td>
                  <td style={{ padding: "0.875rem 1rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>{op.lastSeen}</td>
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button className="btn btn-ghost" style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem" }}>Edit</button>
                      <button className="btn btn-ghost" style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem", color: "var(--red)", borderColor: "rgba(239,68,68,0.3)" }}>Deactivate</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Zones Config ── */}
      {tab === "zones" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {ZONES_CONFIG.map(z => (
            <div key={z.name} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <h3>{z.name}</h3>
                    <span className={`badge ${z.status === "Open" ? "badge-green" : "badge-amber"}`} style={{ fontSize: "0.68rem" }}>{z.status}</span>
                  </div>
                  <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                    {[
                      { l: "Capacity", v: z.capacity + " slots" },
                      { l: "Levels",   v: z.level },
                      { l: "Pricing",  v: z.pricing },
                      { l: "Barrier",  v: z.barrier },
                    ].map(r => (
                      <div key={r.l}>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{r.l}</div>
                        <div style={{ fontSize: "0.88rem", fontWeight: 600, color: r.l === "Barrier" && r.v === "Offline" ? "var(--red)" : "var(--text-primary)" }}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="btn btn-ghost" style={{ fontSize: "0.8rem" }}>Configure</button>
                  <button className="btn btn-ghost" style={{ fontSize: "0.8rem", color: "var(--red)", borderColor: "rgba(239,68,68,0.3)" }}>Close Zone</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Sensors ── */}
      {tab === "sensors" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
            <span className="section-title">Sensor Health Dashboard</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <span className="badge badge-green" style={{ fontSize: "0.7rem" }}>4 OK</span>
              <span className="badge badge-amber" style={{ fontSize: "0.7rem" }}>1 Warning</span>
              <span className="badge badge-red"   style={{ fontSize: "0.7rem" }}>1 Offline</span>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--bg-elevated)" }}>
              <tr>{["Sensor ID","Zone","Type","Battery","Status","Last Ping","Action"].map(h => <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--border)" }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {SENSORS.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.875rem 1rem", fontFamily: "monospace", fontWeight: 700, color: "var(--accent)", fontSize: "0.85rem" }}>{s.id}</td>
                  <td style={{ padding: "0.875rem 1rem", fontSize: "0.85rem" }}>{s.zone}</td>
                  <td style={{ padding: "0.875rem 1rem", fontSize: "0.82rem", color: "var(--text-secondary)" }}>{s.type}</td>
                  <td style={{ padding: "0.875rem 1rem" }}>
                    {s.battery !== null ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ width: "50px", height: "6px", background: "var(--bg-elevated)", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ width: `${s.battery}%`, height: "100%", background: s.battery < 20 ? "var(--red)" : s.battery < 40 ? "var(--amber)" : "var(--green)", borderRadius: "3px" }} />
                        </div>
                        <span style={{ fontSize: "0.78rem", color: s.battery < 20 ? "var(--red)" : s.battery < 40 ? "var(--amber)" : "var(--green)", fontWeight: 600 }}>{s.battery}%</span>
                      </div>
                    ) : <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>N/A</span>}
                  </td>
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <span className={`badge ${s.status === "OK" ? "badge-green" : s.status === "Warning" ? "badge-amber" : "badge-red"}`} style={{ fontSize: "0.68rem" }}>{s.status}</span>
                  </td>
                  <td style={{ padding: "0.875rem 1rem", fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{s.lastPing}</td>
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <button className="btn btn-ghost" style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem" }}>Reboot</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Alerts ── */}
      {tab === "alerts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {ALERTS.map((a, i) => (
            <div key={i} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <h3 style={{ fontSize: "0.92rem" }}>{a.name}</h3>
                    <span className={`badge ${a.enabled ? "badge-green" : ""}`} style={{ fontSize: "0.65rem", ...(!a.enabled ? { background: "var(--bg-hover)", color: "var(--text-muted)", border: "1px solid var(--border)" } : {}) }}>{a.enabled ? "Active" : "Disabled"}</span>
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Condition: <span style={{ color: "var(--text-secondary)" }}>{a.condition}</span></div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Action: <span style={{ color: "var(--text-secondary)" }}>{a.action}</span></div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="btn btn-ghost" style={{ fontSize: "0.78rem" }}>Edit</button>
                  <button className="btn btn-ghost" style={{ fontSize: "0.78rem", color: a.enabled ? "var(--amber)" : "var(--green)", borderColor: a.enabled ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.3)" }}>
                    {a.enabled ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button className="btn btn-accent" style={{ alignSelf: "flex-start", fontSize: "0.82rem" }}>+ Create Alert Rule</button>
        </div>
      )}

      {/* ── System Logs ── */}
      {tab === "logs" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
            <span className="section-title">System Event Log</span>
            <button className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem" }}>Download Logs</button>
          </div>
          <div style={{ padding: "0.75rem 1.25rem", fontFamily: "monospace", fontSize: "0.82rem", display: "flex", flexDirection: "column", gap: "0" }}>
            {LOGS.map((l, i) => (
              <div key={i} style={{ display: "flex", gap: "1rem", padding: "0.6rem 0", borderBottom: "1px solid var(--border)", alignItems: "flex-start" }}>
                <span style={{ color: "var(--text-muted)", flexShrink: 0, minWidth: "70px" }}>{l.time}</span>
                <span style={{ flexShrink: 0, fontWeight: 700, minWidth: "50px", color: l.level === "ERROR" ? "var(--red)" : l.level === "WARN" ? "var(--amber)" : "var(--green)" }}>{l.level}</span>
                <span style={{ color: "var(--text-secondary)" }}>{l.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
