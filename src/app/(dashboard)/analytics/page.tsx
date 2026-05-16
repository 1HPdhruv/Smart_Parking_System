"use client";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

/* ── Revenue trend (last 14 days) ── */
const revData = [
  { day: "May 3",  rev: 28400, sessions: 310 },
  { day: "May 4",  rev: 31200, sessions: 345 },
  { day: "May 5",  rev: 29800, sessions: 328 },
  { day: "May 6",  rev: 22100, sessions: 241 },
  { day: "May 7",  rev: 19400, sessions: 210 },
  { day: "May 8",  rev: 35600, sessions: 392 },
  { day: "May 9",  rev: 38200, sessions: 421 },
  { day: "May 10", rev: 41000, sessions: 452 },
  { day: "May 11", rev: 37500, sessions: 412 },
  { day: "May 12", rev: 26200, sessions: 288 },
  { day: "May 13", rev: 21800, sessions: 236 },
  { day: "May 14", rev: 39800, sessions: 438 },
  { day: "May 15", rev: 43100, sessions: 475 },
  { day: "May 16", rev: 41250, sessions: 460 },
];

/* ── Occupancy heatmap data (hour × day) ── */
const HOURS = ["6am","7am","8am","9am","10am","11am","12pm","1pm","2pm","3pm","4pm","5pm","6pm","7pm","8pm","9pm"];
const DAYS  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const heatmap: { day: string; hour: string; pct: number }[] = [];
DAYS.forEach(day => {
  HOURS.forEach(hour => {
    const weekend = day === "Sat" || day === "Sun";
    const base = weekend ? 30 : 50;
    const peak = (hour === "9am" || hour === "10am" || hour === "6pm") ? 35 : 0;
    const rand = Math.floor(Math.random() * 20);
    heatmap.push({ day, hour, pct: Math.min(100, base + peak + rand) });
  });
});

/* ── Dwell time ── */
const dwellData = [
  { bucket: "<15m", count: 82 }, { bucket: "15–30m", count: 145 }, { bucket: "30–60m", count: 198 },
  { bucket: "1–2h",  count: 134 }, { bucket: "2–4h", count: 76 }, { bucket: "4h+", count: 28 },
];

/* ── Top vehicles ── */
const topVehicles = [
  { plate: "MH12-AB-4521", sessions: 28, revenue: 4200 },
  { plate: "DL03-XZ-9910", sessions: 24, revenue: 3600 },
  { plate: "KA01-CD-1234", sessions: 21, revenue: 3150 },
  { plate: "GJ05-PQ-3345", sessions: 18, revenue: 2700 },
  { plate: "TN22-EF-7890", sessions: 15, revenue: 2250 },
];

const TOOLTIP_STYLE = {
  contentStyle: { background: "#1a1a1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", fontSize: "12px", color: "#f4f4f5" },
  labelStyle: { color: "#a1a1aa" },
};

function heatColor(pct: number) {
  if (pct < 30) return "rgba(34,197,94,0.15)";
  if (pct < 55) return "rgba(34,197,94,0.4)";
  if (pct < 70) return "rgba(245,158,11,0.5)";
  if (pct < 85) return "rgba(239,68,68,0.4)";
  return "rgba(239,68,68,0.75)";
}

export default function AnalyticsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Summary KPIs ── */}
      <div className="grid-metrics">
        {[
          { label: "Total Revenue (MTD)",    value: "₹4.86L",  trend: "+14.2% MoM", up: true  },
          { label: "Total Sessions (MTD)",   value: "5,284",   trend: "+8.7% MoM",  up: true  },
          { label: "Avg. Revenue / Session", value: "₹92",     trend: "+5.1% MoM",  up: true  },
          { label: "Avg. Dwell Time",        value: "42 min",  trend: "+3 min MoM", up: false },
        ].map((m, i) => (
          <div key={i} className="metric-card animate-fade-up" style={{ animationDelay: `${i * 0.07}s` }}>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{ fontSize: "1.8rem" }}>{m.value}</div>
            <div className={`metric-trend ${m.up ? "up" : "down"}`}>{m.up ? "↑" : "↓"} {m.trend}</div>
          </div>
        ))}
      </div>

      {/* ── Revenue + Sessions trend ── */}
      <div className="card animate-fade-up-1" style={{ height: "300px", display: "flex", flexDirection: "column" }}>
        <div className="section-header">
          <span className="section-title">Revenue & Sessions — Last 14 Days</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-ghost" style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem" }}>Export CSV</button>
            <button className="btn btn-ghost" style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem" }}>Export PDF</button>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#4f6ef7" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="#4f6ef7" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gSes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" stroke="#3f3f46" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="rev" stroke="#3f3f46" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <YAxis yAxisId="ses" orientation="right" stroke="#3f3f46" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number, name: string) => [name === "rev" ? `₹${v.toLocaleString()}` : v, name === "rev" ? "Revenue" : "Sessions"]} />
              <Area yAxisId="rev" type="monotone" dataKey="rev"      stroke="#4f6ef7" strokeWidth={2} fill="url(#gRev)" dot={false} />
              <Area yAxisId="ses" type="monotone" dataKey="sessions" stroke="#22c55e" strokeWidth={2} fill="url(#gSes)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Heatmap + Dwell Time ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>

        {/* Occupancy Heatmap */}
        <div className="card animate-fade-up-2">
          <div className="section-header" style={{ marginBottom: "1rem" }}>
            <span className="section-title">Occupancy Heatmap — Hour × Day of Week</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: `60px repeat(${HOURS.length}, 1fr)`, gap: "3px", minWidth: "580px" }}>
              {/* Header row */}
              <div />
              {HOURS.map(h => (
                <div key={h} style={{ fontSize: "0.6rem", color: "var(--text-muted)", textAlign: "center", paddingBottom: "4px", fontWeight: 500 }}>{h}</div>
              ))}
              {/* Data rows */}
              {DAYS.map(day => (
                <>
                  <div key={`label-${day}`} style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", fontWeight: 500 }}>{day}</div>
                  {HOURS.map(hour => {
                    const cell = heatmap.find(c => c.day === day && c.hour === hour);
                    const pct = cell?.pct ?? 0;
                    return (
                      <div
                        key={`${day}-${hour}`}
                        title={`${day} ${hour}: ${pct}%`}
                        style={{
                          background: heatColor(pct),
                          borderRadius: "3px",
                          height: "22px",
                          border: "1px solid rgba(255,255,255,0.04)",
                          transition: "transform 0.15s",
                          cursor: "pointer",
                        }}
                      />
                    );
                  })}
                </>
              ))}
            </div>
            {/* Heatmap legend */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.875rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
              <span>Low</span>
              {["rgba(34,197,94,0.15)","rgba(34,197,94,0.4)","rgba(245,158,11,0.5)","rgba(239,68,68,0.4)","rgba(239,68,68,0.75)"].map((c, i) => (
                <div key={i} style={{ width: "24px", height: "12px", background: c, borderRadius: "3px" }} />
              ))}
              <span>High</span>
            </div>
          </div>
        </div>

        {/* Dwell Time Distribution */}
        <div className="card animate-fade-up-2" style={{ display: "flex", flexDirection: "column" }}>
          <div className="section-header">
            <span className="section-title">Dwell Time Distribution</span>
          </div>
          <div style={{ flex: 1, minHeight: "220px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dwellData} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="bucket" stroke="#3f3f46" tick={{ fill: "#71717a", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#3f3f46" tick={{ fill: "#71717a", fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [v, "Sessions"]} />
                <Bar dataKey="count" fill="#4f6ef7" radius={[4, 4, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Top Vehicles ── */}
      <div className="card animate-fade-up-3">
        <div className="section-header">
          <span className="section-title">Top Vehicles by Sessions (This Month)</span>
          <button className="btn btn-ghost" style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem" }}>Export</button>
        </div>
        <div className="table-wrapper" style={{ border: "none" }}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Plate Number</th>
                <th>Sessions</th>
                <th>Revenue Generated</th>
                <th>Avg. per Session</th>
              </tr>
            </thead>
            <tbody>
              {topVehicles.map((v, i) => (
                <tr key={v.plate}>
                  <td style={{ color: "var(--text-muted)", fontWeight: 600 }}>#{i + 1}</td>
                  <td><span style={{ fontFamily: "monospace", color: "var(--accent)", fontWeight: 600 }}>{v.plate}</span></td>
                  <td>{v.sessions}</td>
                  <td style={{ color: "var(--green)", fontWeight: 600 }}>₹{v.revenue.toLocaleString()}</td>
                  <td style={{ color: "var(--text-secondary)" }}>₹{Math.round(v.revenue / v.sessions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
