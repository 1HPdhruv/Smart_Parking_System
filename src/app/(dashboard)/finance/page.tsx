"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const TRANSACTIONS = [
  { id:"TXN-0091", plate:"MH12-AB-4521", zone:"Zone A · L1", entry:"09:14", exit:"11:02", duration:"1h 48m", fee:162, method:"UPI",  date:"May 16" },
  { id:"TXN-0090", plate:"KA01-CD-1234", zone:"Zone A · L1", entry:"08:00", exit:"09:45", duration:"1h 45m", fee:157, method:"Card", date:"May 16" },
  { id:"TXN-0089", plate:"TN22-EF-7890", zone:"Zone C · L3", entry:"11:15", exit:"12:00", duration:"45m",    fee:68,  method:"Cash", date:"May 16" },
  { id:"TXN-0088", plate:"RJ14-MN-8821", zone:"Zone A · L2", entry:"13:00", exit:"14:30", duration:"1h 30m", fee:135, method:"UPI",  date:"May 16" },
  { id:"TXN-0087", plate:"UP32-YZ-5512", zone:"Zone C · L2", entry:"09:00", exit:"10:15", duration:"1h 15m", fee:113, method:"Card", date:"May 16" },
  { id:"TXN-0086", plate:"DL03-XZ-9910", zone:"Zone C · L3", entry:"06:30", exit:"07:20", duration:"50m",    fee:75,  method:"UPI",  date:"May 16" },
  { id:"TXN-0085", plate:"HR26-GH-0099", zone:"Zone A · L1", entry:"05:00", exit:"06:45", duration:"1h 45m", fee:157, method:"Cash", date:"May 15" },
];

const ZONE_REVENUE = [
  { zone:"Zone A", revenue: 18400, sessions: 198 },
  { zone:"Zone B", revenue: 14200, sessions: 152 },
  { zone:"Zone C", revenue: 8650,  sessions: 110 },
];

const TARIFF = [
  { band: "First 30 min",  rate: "₹20 flat" },
  { band: "30–60 min",     rate: "₹15 / 15 min" },
  { band: "1h – 3h",       rate: "₹12 / 15 min" },
  { band: "3h – 6h",       rate: "₹10 / 15 min" },
  { band: "6h+",           rate: "₹8  / 15 min" },
  { band: "Lost ticket",   rate: "₹500 flat" },
];

const TOOLTIP_STYLE = {
  contentStyle: { background: "#1a1a1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", fontSize: "12px", color: "#f4f4f5" },
  labelStyle: { color: "#a1a1aa" },
};

export default function FinancePage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Revenue KPI Cards ── */}
      <div className="grid-metrics">
        {[
          { label: "Today's Revenue",      value: "₹41,250", trend: "+11.3%",  up: true  },
          { label: "This Week",            value: "₹2.48L",  trend: "+8.2%",   up: true  },
          { label: "This Month (MTD)",     value: "₹4.86L",  trend: "+14.2%",  up: true  },
          { label: "Avg. Fee per Session", value: "₹92",     trend: "+₹5 MoM", up: true  },
        ].map((m, i) => (
          <div key={i} className="metric-card animate-fade-up" style={{ animationDelay: `${i * 0.07}s` }}>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{ fontSize: "1.7rem" }}>{m.value}</div>
            <div className={`metric-trend ${m.up ? "up" : "down"}`}>{m.up ? "↑" : "↓"} {m.trend}</div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.25rem" }}>
        {/* Revenue by Zone */}
        <div className="card" style={{ height: "260px", display: "flex", flexDirection: "column" }}>
          <div className="section-header">
            <span className="section-title">Revenue by Zone (Today)</span>
            <button className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem" }}>Export</button>
          </div>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ZONE_REVENUE} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="zone" stroke="#3f3f46" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#3f3f46" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number, name: string) => [name === "revenue" ? `₹${v.toLocaleString()}` : v, name === "revenue" ? "Revenue" : "Sessions"]} />
                <Bar dataKey="revenue" fill="#4f6ef7" radius={[6, 6, 0, 0]} name="revenue" />
                <Bar dataKey="sessions" fill="#22c55e" radius={[6, 6, 0, 0]} name="sessions" opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tariff Schedule */}
        <div className="card">
          <div className="section-header" style={{ marginBottom: "0.75rem" }}>
            <span className="section-title">Active Tariff Schedule</span>
            <span className="badge badge-green" style={{ fontSize: "0.68rem" }}>Live</span>
          </div>
          <div>
            {TARIFF.map((t, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.55rem 0", borderBottom: "1px solid var(--border)", fontSize: "0.82rem" }}>
                <span style={{ color: "var(--text-muted)" }}>{t.band}</span>
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--accent)" }}>{t.rate}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-ghost" style={{ marginTop: "1rem", width: "100%", justifyContent: "center", fontSize: "0.8rem" }}>
            Edit Tariff Rules
          </button>
        </div>
      </div>

      {/* ── Transactions Table ── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="section-title">Transaction History</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem" }}>Export CSV</button>
            <button className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem" }}>Export PDF</button>
          </div>
        </div>
        <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Txn ID</th><th>Plate</th><th>Zone</th><th>Entry</th>
                <th>Exit</th><th>Duration</th><th>Amount</th><th>Method</th>
              </tr>
            </thead>
            <tbody>
              {TRANSACTIONS.map(t => (
                <tr key={t.id}>
                  <td style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--text-muted)" }}>{t.id}</td>
                  <td><span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--accent)" }}>{t.plate}</span></td>
                  <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{t.zone}</td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{t.entry}</td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{t.exit}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{t.duration}</td>
                  <td style={{ fontWeight: 700, color: "var(--green)" }}>₹{t.fee}</td>
                  <td>
                    <span className={`badge ${t.method === "UPI" ? "badge-accent" : t.method === "Card" ? "badge-amber" : ""}`} style={{ fontSize: "0.68rem", background: t.method === "Cash" ? "var(--bg-hover)" : undefined, color: t.method === "Cash" ? "var(--text-muted)" : undefined }}>
                      {t.method}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
