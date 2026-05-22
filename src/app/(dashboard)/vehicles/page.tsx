"use client";
import { useState, useEffect, useMemo } from "react";
import { io, Socket } from "socket.io-client";

interface SessionData {
  id: string;
  plate: string;
  entryTime: string;
  exitTime: string | null;
  fee: number | null;
  status: "ACTIVE" | "COMPLETED";
  slot?: { id: string; zone: { name: string; level: string } };
}

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
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [selected, setSelected] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${apiUrl}/api/vehicles/sessions`);
        if (res.ok) {
          const data = await res.json();
          setSessions(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const socket: Socket = io(socketUrl);

    socket.on("ANPR_EVENT", () => {
      // Re-fetch sessions on any new ANPR event
      fetch(`${socketUrl}/api/vehicles/sessions`)
        .then(r => r.json())
        .then(data => setSessions(data))
        .catch(() => {});
    });

    return () => { socket.disconnect(); };
  }, []);

  const filtered = useMemo(() =>
    sessions.filter(e =>
      e.plate.toLowerCase().includes(search.toLowerCase()) ||
      (e.slot?.zone.name.toLowerCase() || "").includes(search.toLowerCase())
    ), [search, sessions]);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDuration = (entry: string, exit: string | null) => {
    const end = exit ? new Date(exit) : new Date();
    const diffMins = Math.floor((end.getTime() - new Date(entry).getTime()) / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs}h ${mins}m`;
  };

  const activeSessionsCount = sessions.filter(s => s.status === "ACTIVE").length;

  if (loading) return <div style={{ padding: "2rem", color: "var(--text-muted)" }}>Loading session database...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* ── Summary Cards ── */}
      <div className="grid-metrics">
        {[
          { label: "Total Events Logged", value: sessions.length.toString(), trend: "Database", up: true },
          { label: "Active Sessions",     value: activeSessionsCount.toString(), trend: "Live", up: true },
          { label: "Blocked Vehicles",    value: BLOCKLIST.length.toString(), trend: "Alert", up: false },
          { label: "Whitelisted",         value: WHITELIST.length.toString(), trend: "No fee", up: true },
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
                    <th>Duration</th><th>Fee</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>No sessions found in the database.</td></tr>
                  ) : filtered.map(e => (
                    <tr key={e.id} onClick={() => setSelected(selected?.id === e.id ? null : e)} style={{ cursor: "pointer" }}>
                      <td><span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--accent)" }}>{e.plate}</span></td>
                      <td>
                        {e.slot ? (
                          <span style={{ fontSize: "0.8rem" }}>{e.slot.zone.name} · {e.slot.id}</span>
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Unknown</span>
                        )}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{formatTime(e.entryTime)}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.85rem", color: e.exitTime ? "var(--text-primary)" : "var(--text-muted)" }}>{e.exitTime ? formatTime(e.exitTime) : "—"}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{getDuration(e.entryTime, e.exitTime)}</td>
                      <td style={{ color: "var(--green)", fontWeight: 600 }}>{e.fee ? `₹${e.fee}` : "—"}</td>
                      <td><span className={`badge ${e.action === "ACTIVE" || e.status === "ACTIVE" ? "badge-green" : ""}`} style={{ fontSize: "0.68rem", background: e.status === "ACTIVE" ? "var(--green-dim)" : "var(--bg-hover)", color: e.status === "ACTIVE" ? "var(--green)" : "var(--text-muted)", borderColor: e.status === "ACTIVE" ? "rgba(34,197,94,0.25)" : "var(--border)" }}>{e.status}</span></td>
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
              { l: "Zone / Slot", v: selected.slot ? `${selected.slot.zone.name} · ${selected.slot.id}` : "Unknown" },
              { l: "Entry Time",  v: new Date(selected.entryTime).toLocaleString() },
              { l: "Exit Time",   v: selected.exitTime ? new Date(selected.exitTime).toLocaleString() : "Still Active" },
              { l: "Duration",    v: getDuration(selected.entryTime, selected.exitTime) },
              { l: "Total Fee",   v: selected.fee ? `₹${selected.fee}` : "Accruing..." },
              { l: "Status",      v: selected.status },
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
