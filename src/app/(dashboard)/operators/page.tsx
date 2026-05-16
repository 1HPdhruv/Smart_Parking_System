"use client";

const OPERATORS = [
  { name:"Rahul Sharma",  role:"Admin",    zone:"All Zones", shift:"08:00–20:00", status:"On Duty",  today: 142 },
  { name:"Priya Mehta",   role:"Operator", zone:"Zone A",    shift:"06:00–14:00", status:"On Duty",  today: 88  },
  { name:"Arjun Singh",   role:"Operator", zone:"Zone B",    shift:"14:00–22:00", status:"Off Duty", today: 0   },
  { name:"Sneha Patel",   role:"Viewer",   zone:"Zone C",    shift:"10:00–18:00", status:"On Duty",  today: 34  },
  { name:"Vikram Nair",   role:"Operator", zone:"Zone A,B",  shift:"22:00–06:00", status:"Off Duty", today: 0   },
];

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const SHIFTS = [
  { name:"Rahul Sharma",  slots:[1,1,1,1,1,0,0] },
  { name:"Priya Mehta",   slots:[2,2,2,2,2,2,0] },
  { name:"Arjun Singh",   slots:[3,3,3,3,3,0,0] },
  { name:"Sneha Patel",   slots:[2,0,2,0,2,2,2] },
  { name:"Vikram Nair",   slots:[0,3,0,3,0,3,3] },
];
const SHIFT_LABEL: Record<number, string> = { 0: "", 1: "08–20", 2: "06–14", 3: "14–22" };
const SHIFT_COLOR: Record<number, string> = {
  0: "transparent",
  1: "rgba(79,110,247,0.2)",
  2: "rgba(34,197,94,0.18)",
  3: "rgba(245,158,11,0.18)",
};
const SHIFT_TEXT: Record<number, string> = {
  0: "transparent",
  1: "var(--accent)",
  2: "var(--green)",
  3: "var(--amber)",
};

export default function OperatorsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Operator Cards ── */}
      <div className="grid-metrics">
        {OPERATORS.map((op, i) => (
          <div key={i} className="metric-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div className="avatar" style={{ marginBottom: "0.75rem" }}>{op.name.split(" ").map(n=>n[0]).join("")}</div>
              <span className={`badge ${op.status === "On Duty" ? "badge-green" : ""}`} style={{ fontSize: "0.65rem", ...( op.status !== "On Duty" ? { background: "var(--bg-hover)", color: "var(--text-muted)", border: "1px solid var(--border)" } : {}) }}>
                {op.status}
              </span>
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>{op.name}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>{op.role} · {op.zone}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>Shift: {op.shift}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--accent)", marginTop: "0.25rem", fontWeight: 600 }}>{op.today > 0 ? `${op.today} sessions handled` : "Not on shift"}</div>
          </div>
        ))}
      </div>

      {/* ── Weekly Shift Schedule ── */}
      <div className="card">
        <div className="section-header">
          <span className="section-title">Weekly Shift Schedule — May 12–18, 2025</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem" }}>← Prev Week</button>
            <button className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem" }}>Next Week →</button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "560px" }}>
            <thead>
              <tr>
                <th style={{ padding: "0.625rem 1rem", textAlign: "left", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Operator</th>
                {DAYS.map(d => <th key={d} style={{ padding: "0.625rem 0.75rem", textAlign: "center", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {SHIFTS.map(row => (
                <tr key={row.name} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>{row.name}</td>
                  {row.slots.map((s, i) => (
                    <td key={i} style={{ padding: "0.5rem 0.4rem", textAlign: "center" }}>
                      {s > 0 ? (
                        <div style={{
                          background: SHIFT_COLOR[s], color: SHIFT_TEXT[s],
                          borderRadius: "6px", padding: "0.3rem 0.4rem",
                          fontSize: "0.68rem", fontWeight: 700, lineHeight: 1.2,
                          border: `1px solid ${SHIFT_TEXT[s]}30`,
                        }}>
                          {SHIFT_LABEL[s]}
                        </div>
                      ) : (
                        <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>—</div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {[[1,"var(--accent)","Morning (08–20)"],[2,"var(--green)","Day (06–14)"],[3,"var(--amber)","Evening (14–22)"]].map(([k,c,l]) => (
            <div key={String(k)} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: SHIFT_COLOR[Number(k)], border: `1px solid ${c}50` }} />
              {String(l)}
            </div>
          ))}
        </div>
      </div>

      {/* ── Activity Log ── */}
      <div className="card">
        <div className="section-header">
          <span className="section-title">Operator Activity Log (Today)</span>
        </div>
        <div>
          {[
            { name:"Rahul Sharma",  action:"Approved manual override for barrier B2", time:"13:50" },
            { name:"Priya Mehta",   action:"Checked in vehicle MH12-AB-4521 manually", time:"12:30" },
            { name:"Rahul Sharma",  action:"Updated Zone A pricing to Peak tariff", time:"11:00" },
            { name:"Sneha Patel",   action:"Viewed Zone C sensor dashboard", time:"10:15" },
            { name:"Priya Mehta",   action:"Started shift — logged in", time:"06:00" },
          ].map((l, i) => (
            <div key={i} className="feed-item">
              <div className="avatar" style={{ width: "32px", height: "32px", fontSize: "0.68rem", flexShrink: 0 }}>
                {l.name.split(" ").map(n=>n[0]).join("")}
              </div>
              <div className="feed-main">
                <div className="feed-title" style={{ color: "var(--text-primary)" }}>
                  <span style={{ color: "var(--accent)" }}>{l.name}</span> {l.action}
                </div>
                <div className="feed-sub">{l.time} today</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
