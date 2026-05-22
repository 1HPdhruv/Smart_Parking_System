"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [notifs, setNotifs] = useState({ email: true, occupancy: true, revenue: false, sensor: true });
  
  const [user, setUser] = useState({ id: "", firstName: "", lastName: "", email: "", role: "Loading..." });

  useEffect(() => {
    const storedUser = localStorage.getItem("parker_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const save = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${apiUrl}/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: user.firstName, lastName: user.lastName, email: user.email })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("parker_user", JSON.stringify(data.user));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      console.error("Failed to update profile", e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("parker_token");
    localStorage.removeItem("parker_user");
    router.push("/");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "720px" }}>

      {/* ── Profile ── */}
      <div className="card">
        <h3 style={{ marginBottom: "1.25rem" }}>Profile Settings</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>First Name</label>
              <input className="input" value={user.firstName} onChange={e => setUser({...user, firstName: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>Last Name</label>
              <input className="input" value={user.lastName} onChange={e => setUser({...user, lastName: e.target.value})} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>Email</label>
            <input className="input" type="email" value={user.email} onChange={e => setUser({...user, email: e.target.value})} />
          </div>
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>Role</label>
            <input className="input" value={user.role} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
          </div>
          <button onClick={save} className="btn btn-primary" style={{ alignSelf: "flex-start", padding: "0.5rem 1.25rem" }}>
            {saved ? "✓ Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ── Notifications ── */}
      <div className="card">
        <h3 style={{ marginBottom: "1.25rem" }}>Notification Preferences</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {[
            { key:"email",     label:"Email notifications",       sub:"Receive daily digest and alerts via email" },
            { key:"occupancy", label:"Occupancy alerts",          sub:"Notify when any zone exceeds 90% capacity" },
            { key:"revenue",   label:"Revenue milestones",        sub:"Alert when daily target is reached" },
            { key:"sensor",    label:"Sensor offline alerts",     sub:"Immediate alert when a sensor goes offline" },
          ].map(n => (
            <div key={n.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)" }}>{n.label}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>{n.sub}</div>
              </div>
              <button
                onClick={() => setNotifs(p => ({ ...p, [n.key]: !p[n.key as keyof typeof p] }))}
                style={{
                  width: "44px", height: "24px", borderRadius: "12px", border: "none", cursor: "pointer",
                  background: notifs[n.key as keyof typeof notifs] ? "var(--accent)" : "var(--bg-elevated)",
                  transition: "background 0.2s",
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                <div style={{
                  width: "18px", height: "18px", borderRadius: "50%", background: "white",
                  position: "absolute", top: "3px", transition: "left 0.2s",
                  left: notifs[n.key as keyof typeof notifs] ? "23px" : "3px",
                }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── API Keys ── */}
      <div className="card">
        <h3 style={{ marginBottom: "1.25rem" }}>API Keys</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {[
            { label:"Production API Key", key:"pk_live_••••••••••••••••4521", created:"Jan 1, 2025" },
            { label:"Webhook Secret",     key:"wh_••••••••••••••••9910",      created:"Feb 15, 2025" },
          ].map(k => (
            <div key={k.label} style={{ padding: "0.875rem 1rem", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-strong)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                <code style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--accent)" }}>{k.key}</code>
                <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                  <button className="btn btn-ghost" style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem" }}>Reveal</button>
                  <button className="btn btn-ghost" style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem" }}>Rotate</button>
                </div>
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>Created {k.created}</div>
            </div>
          ))}
          <button className="btn btn-ghost" style={{ alignSelf: "flex-start", fontSize: "0.8rem" }}>+ Generate New Key</button>
        </div>
      </div>

      {/* ── Danger Zone / Session Management ── */}
      <div className="card" style={{ border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.03)" }}>
        <h3 style={{ marginBottom: "0.5rem", color: "var(--red)" }}>Account Management</h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
          Manage your active session or reset system configurations.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button onClick={handleLogout} className="btn btn-ghost" style={{ fontSize: "0.82rem", color: "white", background: "var(--red)", borderColor: "var(--red)", fontWeight: 600 }}>
            Log Out of Parker OS
          </button>
          <button className="btn btn-ghost" style={{ fontSize: "0.82rem", color: "var(--text-secondary)", borderColor: "rgba(255,255,255,0.1)" }}>
            Deactivate Account
          </button>
        </div>
      </div>
    </div>
  );
}
