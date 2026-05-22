"use client";
import { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { OccupancyChart } from "@/components/charts/occupancy-chart";

type SlotStatus = "available" | "occupied" | "reserved";
type FilterType = "all" | SlotStatus;

interface Slot { id: string; status: SlotStatus; plate?: string; since?: string; }

const PLATES = ["MH12-AB-4521","DL03-XZ-9910","KA01-CD-1234","TN22-EF-7890","GJ05-PQ-3345","RJ14-MN-8821","UP32-YZ-5512","HR26-GH-0099"];

const generateSlots = (): Slot[] =>
  Array.from({ length: 48 }, (_, i) => {
    const r = Math.random();
    const status: SlotStatus = r > 0.38 ? "occupied" : r > 0.12 ? "available" : "reserved";
    return {
      id: `A${String(i + 1).padStart(2, "0")}`,
      status,
      plate: status === "occupied" ? PLATES[i % PLATES.length] : undefined,
      since: status === "occupied" ? `${Math.floor(Math.random() * 90 + 5)}m ago` : undefined,
    };
  });

interface ANPREvent { plate: string; zone: string; time: string; action: "ENTRY" | "EXIT"; }

const INITIAL_FEED: ANPREvent[] = [
  { plate: "MH12-AB-4521", zone: "Zone A · L1", time: "Just now",   action: "ENTRY" },
  { plate: "DL03-XZ-9910", zone: "Zone B · L2", time: "1 min ago",  action: "EXIT"  },
  { plate: "KA01-CD-1234", zone: "Zone A · L1", time: "3 mins ago", action: "ENTRY" },
  { plate: "TN22-EF-7890", zone: "Zone C · L3", time: "6 mins ago", action: "EXIT"  },
  { plate: "GJ05-PQ-3345", zone: "Zone B · L1", time: "9 mins ago", action: "ENTRY" },
];

const sensors = [
  { label: "Zone A Sensors", ok: 38, warn: 1, offline: 1 },
  { label: "Zone B Sensors", ok: 55, warn: 3, offline: 2 },
  { label: "Zone C Sensors", ok: 28, warn: 0, offline: 2 },
  { label: "ANPR Cameras",   ok: 8,  warn: 1, offline: 0 },
];

export default function LiveDashboardPage() {
  const [slots, setSlots]       = useState<Slot[]>(generateSlots);
  const [filter, setFilter]     = useState<FilterType>("all");
  const [live, setLive]         = useState(true);
  const [feed, setFeed]         = useState<ANPREvent[]>(INITIAL_FEED);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [newEvent, setNewEvent] = useState(false);

  useEffect(() => {
    if (!live) return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const socket: Socket = io(socketUrl);

    socket.on("connect", () => {
      console.log("Connected to live server");
    });

    socket.on("SLOT_UPDATE", (data: { slotId: string; status: SlotStatus; plate?: string }) => {
      setSlots(prev => prev.map(s => 
        s.id === data.slotId 
          ? { ...s, status: data.status, plate: data.plate, since: "Just now" } 
          : s
      ));
    });

    socket.on("ANPR_EVENT", (data: { plate: string; action: "ENTRY" | "EXIT"; timestamp: string; slotId?: string }) => {
      const zones = ["Zone A · L1", "Zone B · L2", "Zone C · L3"];
      const zone = data.slotId ? `Zone A · ${data.slotId}` : zones[Math.floor(Math.random()*zones.length)];
      const event: ANPREvent = { 
        plate: data.plate, 
        zone, 
        time: "Just now", 
        action: data.action 
      };
      
      setFeed(prev => [event, ...prev.slice(0, 9)]);
      setNewEvent(true);
      setTimeout(() => setNewEvent(false), 800);
    });

    return () => {
      socket.disconnect();
    };
  }, [live]);

  const occupied  = slots.filter(s => s.status === "occupied").length;
  const available = slots.filter(s => s.status === "available").length;
  const reserved  = slots.filter(s => s.status === "reserved").length;
  const pct       = Math.round((occupied / slots.length) * 100);

  const displayed = filter === "all" ? slots : slots.filter(s => s.status === filter);

  const totalSensorsOk = sensors.reduce((a, s) => a + s.ok, 0);
  const totalSensorsWarn = sensors.reduce((a, s) => a + s.warn, 0);
  const totalSensorsOffline = sensors.reduce((a, s) => a + s.offline, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* ── Sensor Health Banner ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap",
        background: "var(--bg-surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)", padding: "0.75rem 1.25rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="dot dot-green pulse" />
          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)" }}>Sensor Health</span>
        </div>
        <div style={{ display: "flex", gap: "1.25rem", flex: 1, flexWrap: "wrap" }}>
          {sensors.map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{s.label}:</span>
              <span style={{ color: "var(--green)" }}>{s.ok} OK</span>
              {s.warn > 0 && <span style={{ color: "var(--amber)" }}>{s.warn} Warn</span>}
              {s.offline > 0 && <span style={{ color: "var(--red)" }}>{s.offline} Offline</span>}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span className={`badge ${totalSensorsOffline > 0 ? "badge-red" : "badge-green"}`} style={{ fontSize: "0.7rem" }}>
            {totalSensorsOffline > 0 ? `${totalSensorsOffline} Offline` : "All Systems OK"}
          </span>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid-metrics">
        {[
          { label: "Occupancy Rate",   value: `${pct}%`,       trend: pct > 80 ? "High Load" : "Normal",    up: pct < 80, icon: "◎" },
          { label: "Available Slots",  value: `${available}`,  trend: `${reserved} Reserved`,               up: available > 10, icon: "◇" },
          { label: "Today's Revenue",  value: "₹41,250",       trend: "+11.3% vs yesterday",                up: true,  icon: "▲" },
          { label: "Active Sessions",  value: `${occupied}`,   trend: `Avg. 34 min dwell`,                  up: true,  icon: "⬡" },
        ].map((m, i) => (
          <div key={i} className="metric-card animate-fade-up" style={{ animationDelay: `${i * 0.07}s` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div className="metric-label">{m.label}</div>
              <span style={{ fontSize: "1.1rem", color: "var(--accent)", opacity: 0.7 }}>{m.icon}</span>
            </div>
            <div className="metric-value">{m.value}</div>
            <div className={`metric-trend ${m.up ? "up" : "down"}`}>
              {m.up ? "↑" : "↓"} {m.trend}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid-dashboard">

        {/* Left — Slot Grid Panel */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem", minHeight: "480px" }}>
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <div className="section-title">Zone A — Live Slot Grid</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>{slots.length} total · {occupied} occupied · {available} available · {reserved} reserved</div>
            </div>
            {/* Realtime toggle */}
            <button
              onClick={() => setLive(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.4rem 0.875rem", borderRadius: "var(--radius-full)",
                fontSize: "0.78rem", fontWeight: 600, border: "1px solid",
                cursor: "pointer", transition: "all 0.18s",
                background: live ? "var(--green-dim)" : "var(--bg-elevated)",
                color: live ? "var(--green)" : "var(--text-muted)",
                borderColor: live ? "rgba(34,197,94,0.3)" : "var(--border-strong)",
              }}
            >
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "currentColor", ...(live ? { animation: "pulse 2s infinite" } : {}) }} />
              {live ? "Live" : "Paused"}
            </button>
          </div>

          {/* Progress bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
              <span>Overall occupancy</span>
              <span style={{ fontWeight: 700, color: pct > 85 ? "var(--red)" : pct > 60 ? "var(--amber)" : "var(--green)" }}>{pct}%</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct > 85 ? "var(--red)" : pct > 60 ? "var(--amber)" : "var(--green)" }} />
            </div>
          </div>

          {/* Filter bar */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {(["all","available","occupied","reserved"] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "0.3rem 0.75rem", borderRadius: "var(--radius-full)",
                  fontSize: "0.75rem", fontWeight: 600, border: "1px solid", cursor: "pointer", transition: "all 0.15s",
                  background: filter === f
                    ? f === "available" ? "var(--green-dim)" : f === "occupied" ? "var(--red-dim)" : f === "reserved" ? "var(--amber-dim)" : "var(--accent-dim)"
                    : "var(--bg-elevated)",
                  color: filter === f
                    ? f === "available" ? "var(--green)" : f === "occupied" ? "var(--red)" : f === "reserved" ? "var(--amber)" : "var(--accent)"
                    : "var(--text-muted)",
                  borderColor: filter === f
                    ? f === "available" ? "rgba(34,197,94,0.3)" : f === "occupied" ? "rgba(239,68,68,0.3)" : f === "reserved" ? "rgba(245,158,11,0.3)" : "rgba(79,110,247,0.3)"
                    : "var(--border-strong)",
                }}
              >
                {f === "all" ? `All (${slots.length})` : f === "available" ? `Available (${available})` : f === "occupied" ? `Occupied (${occupied})` : `Reserved (${reserved})`}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="legend">
            <div className="legend-item"><span className="dot dot-green" style={{ width: "8px", height: "8px" }} /> Available</div>
            <div className="legend-item"><span className="dot dot-red"   style={{ width: "8px", height: "8px" }} /> Occupied</div>
            <div className="legend-item"><span className="dot dot-amber" style={{ width: "8px", height: "8px" }} /> Reserved</div>
          </div>

          {/* Slot Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "5px" }}>
            {displayed.map(slot => (
              <div
                key={slot.id}
                onClick={() => setSelected(selected?.id === slot.id ? null : slot)}
                className={`slot slot-${slot.status}`}
                style={{
                  outline: selected?.id === slot.id ? "2px solid var(--accent)" : "none",
                  outlineOffset: "2px",
                  cursor: "pointer",
                }}
                title={`${slot.id}${slot.plate ? ` · ${slot.plate}` : ""}`}
              >
                {slot.id}
              </div>
            ))}
            {displayed.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                No {filter} slots in Zone A
              </div>
            )}
          </div>

          {/* Slot detail popover */}
          {selected && (
            <div style={{
              background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-md)", padding: "0.875rem 1rem",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              animation: "fadeUp 0.2s ease both",
            }}>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>Slot {selected.id}</div>
                {selected.plate && <div style={{ fontSize: "0.78rem", color: "var(--accent)", fontFamily: "monospace", marginTop: "2px" }}>{selected.plate}</div>}
                {selected.since && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>Parked {selected.since}</div>}
                {selected.status === "available" && <div style={{ fontSize: "0.75rem", color: "var(--green)", marginTop: "2px" }}>Ready for vehicle</div>}
              </div>
              <span className={`badge badge-${selected.status === "available" ? "green" : selected.status === "occupied" ? "red" : "amber"}`}>
                {selected.status}
              </span>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* 24h Chart */}
          <div className="card" style={{ height: "240px", display: "flex", flexDirection: "column" }}>
            <div className="section-header">
              <span className="section-title">24h Occupancy Trend</span>
              <span className="badge badge-accent" style={{ fontSize: "0.68rem" }}>
                <span className="dot dot-accent pulse" style={{ width: "5px", height: "5px" }} /> Live
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <OccupancyChart />
            </div>
          </div>

          {/* Zone Overview */}
          <div className="card">
            <div className="section-header">
              <span className="section-title">Zone Overview</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              {[
                { name: "Zone A", pct, total: 48 },
                { name: "Zone B", pct: 54, total: 60 },
                { name: "Zone C", pct: 89, total: 30 },
              ].map(z => (
                <div key={z.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 500 }}>{z.name}</span>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{z.total} slots</span>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: z.pct > 85 ? "var(--red)" : z.pct > 60 ? "var(--amber)" : "var(--green)" }}>{z.pct}%</span>
                    </div>
                  </div>
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${z.pct}%`, background: z.pct > 85 ? "var(--red)" : z.pct > 60 ? "var(--amber)" : "var(--green)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ANPR Live Feed */}
          <div className="card" style={{ flex: 1 }}>
            <div className="section-header">
              <span className="section-title">ANPR Activity</span>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                {newEvent && <span style={{ fontSize: "0.68rem", color: "var(--green)", fontWeight: 600, animation: "fadeIn 0.3s ease" }}>New!</span>}
                <span className="badge badge-green" style={{ fontSize: "0.68rem" }}>
                  <span className="dot dot-green pulse" style={{ width: "5px", height: "5px" }} /> Live
                </span>
              </div>
            </div>
            <div>
              {feed.slice(0, 6).map((log, i) => (
                <div key={i} className="feed-item" style={{ opacity: i === 0 && newEvent ? 1 : 1 - i * 0.12 }}>
                  <div className="feed-icon" style={{ color: log.action === "ENTRY" ? "var(--green)" : "var(--red)", background: log.action === "ENTRY" ? "var(--green-dim)" : "var(--red-dim)", borderColor: log.action === "ENTRY" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)" }}>
                    {log.action === "ENTRY" ? "IN" : "OUT"}
                  </div>
                  <div className="feed-main">
                    <div className="feed-title">
                      <span>{log.plate}</span> {log.action === "ENTRY" ? "entered" : "exited"}
                    </div>
                    <div className="feed-sub">{log.zone} · {log.time}</div>
                  </div>
                  <span className={`badge ${log.action === "ENTRY" ? "badge-green" : "badge-red"}`} style={{ fontSize: "0.65rem", flexShrink: 0 }}>
                    {log.action}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
