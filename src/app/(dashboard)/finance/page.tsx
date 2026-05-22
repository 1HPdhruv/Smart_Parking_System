"use client";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const TARIFF = [
  { band: "Minimum Fee (1st hr)", rate: "₹50 flat" },
  { band: "Standard Rate",        rate: "₹50 / hour" },
  { band: "Lost ticket/plate",    rate: "₹500 flat" },
];

const TOOLTIP_STYLE = {
  contentStyle: { background: "#1a1a1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", fontSize: "12px", color: "#f4f4f5" },
  labelStyle: { color: "#a1a1aa" },
};

export default function FinancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinance = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${apiUrl}/api/finance`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error("Failed to load finance data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFinance();
  }, []);

  if (loading) return <div style={{ padding: "2rem", color: "var(--text-muted)" }}>Loading financial ledgers...</div>;

  const { kpis, zoneRevenue, transactions } = data || {
    kpis: { revToday: 0, revWeek: 0, revMonth: 0, avgFee: 0 },
    zoneRevenue: [],
    transactions: []
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Revenue KPI Cards ── */}
      <div className="grid-metrics">
        {[
          { label: "Today's Revenue",      value: `₹${kpis.revToday.toLocaleString()}`, trend: "Live DB",  up: true  },
          { label: "This Week",            value: `₹${kpis.revWeek.toLocaleString()}`,  trend: "Live DB",  up: true  },
          { label: "This Month (MTD)",     value: `₹${kpis.revMonth.toLocaleString()}`, trend: "Live DB",  up: true  },
          { label: "Avg. Fee per Session", value: `₹${kpis.avgFee.toLocaleString()}`,   trend: "Live DB",  up: true  },
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
            <span className="section-title">Revenue by Zone (All Time)</span>
            <button className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem" }}>Export</button>
          </div>
          <div style={{ flex: 1 }}>
            {zoneRevenue.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                No completed sessions yet to generate chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoneRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="zone" stroke="#3f3f46" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="#3f3f46" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: number, name: string) => [name === "revenue" ? `₹${v.toLocaleString()}` : v, name === "revenue" ? "Revenue" : "Sessions"]} />
                  <Bar dataKey="revenue" fill="#4f6ef7" radius={[6, 6, 0, 0]} name="revenue" />
                  <Bar dataKey="sessions" fill="#22c55e" radius={[6, 6, 0, 0]} name="sessions" opacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
            )}
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
          <span className="section-title">Transaction Ledger</span>
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
              {transactions.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>No financial transactions logged yet.</td></tr>
              ) : transactions.map((t: any) => (
                <tr key={t.id}>
                  <td style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--text-muted)" }}>{t.id}</td>
                  <td><span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--accent)" }}>{t.plate}</span></td>
                  <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{t.zone}</td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{t.date} {t.entry}</td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{t.date} {t.exit}</td>
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
