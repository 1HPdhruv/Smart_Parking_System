"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const NOTIFICATION_ALERTS = [
  { id: 1, type: "occupancy", msg: "Zone A exceeded 90% occupancy", time: "2 min ago", read: false },
  { id: 2, type: "sensor",    msg: "Sensor B-14 went offline",       time: "8 min ago", read: false },
  { id: 3, type: "revenue",   msg: "Daily revenue target reached",   time: "1 hr ago",  read: true  },
  { id: 4, type: "entry",     msg: "Blocked vehicle GJ05-PQ-3345 attempted entry", time: "2 hr ago", read: true },
];

export function Header({ title = "Live Dashboard" }: { title?: string }) {
  const router = useRouter();
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [user, setUser] = useState({ firstName: "Operator", lastName: "", role: "admin" });
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
      setDate(now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Load user info from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("parker_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
  }, []);

  // Load location
  const [locationName, setLocationName] = useState("");
  useEffect(() => {
    const loc = localStorage.getItem("parker_location");
    if (loc) {
      try {
        const parsed = JSON.parse(loc);
        setLocationName(parsed.place || "");
      } catch {}
    }
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search.trim()) {
      // Navigate to vehicles page with the search query
      router.push(`/vehicles?search=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("parker_token");
    localStorage.removeItem("parker_user");
    router.push("/");
  };

  const unreadCount = NOTIFICATION_ALERTS.filter(n => !n.read).length;
  const initials = `${(user.firstName || "O")[0]}${(user.lastName || "P")[0]}`.toUpperCase();

  return (
    <header className="dashboard-header">
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <div>
          <div className="header-title">{title}</div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>{date}</div>
        </div>
        {/* Live Clock */}
        <div style={{
          fontFamily: "'Courier New', monospace",
          fontSize: "1rem",
          fontWeight: 700,
          color: "var(--accent)",
          background: "var(--accent-dim)",
          border: "1px solid rgba(79,110,247,0.2)",
          borderRadius: "var(--radius-md)",
          padding: "0.3rem 0.75rem",
          letterSpacing: "0.08em",
          lineHeight: 1,
        }}>
          {time}
        </div>
      </div>

      <div className="header-actions">
        {/* Search */}
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "0.9rem", pointerEvents: "none" }}>⌕</span>
          <input
            className="input"
            placeholder="Search plates, zones... ↵"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearch}
            style={{ paddingLeft: "2.2rem", width: "220px", height: "36px", fontSize: "0.82rem" }}
          />
        </div>

        {/* Notification Bell */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button 
            className="icon-btn notification-btn" 
            style={{ position: "relative" }}
            onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && <span className="notif-badge" />}
          </button>

          {/* Notification Dropdown */}
          {showNotifs && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0, width: "320px",
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
              zIndex: 100, animation: "fadeUp 0.15s ease both", overflow: "hidden",
            }}>
              <div style={{ padding: "0.875rem 1rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Notifications</span>
                <span style={{ fontSize: "0.7rem", color: "var(--accent)", cursor: "pointer" }}>Mark all read</span>
              </div>
              {NOTIFICATION_ALERTS.map(n => (
                <div key={n.id} style={{
                  padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)",
                  display: "flex", gap: "0.75rem", alignItems: "flex-start", cursor: "pointer",
                  background: n.read ? "transparent" : "rgba(79,110,247,0.04)",
                  transition: "background 0.15s",
                }}>
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%", marginTop: "5px", flexShrink: 0,
                    background: n.read ? "var(--text-muted)" : "var(--accent)",
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-primary)", lineHeight: 1.4 }}>{n.msg}</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "3px" }}>{n.time}</div>
                  </div>
                </div>
              ))}
              <div style={{ padding: "0.625rem", textAlign: "center" }}>
                <Link href="/settings" style={{ fontSize: "0.78rem", color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
                  onClick={() => setShowNotifs(false)}
                >
                  View Notification Settings →
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="divider" />

        {/* Avatar / Profile Dropdown */}
        <div ref={profileRef} style={{ position: "relative" }}>
          <div 
            onClick={() => { setShowProfile(!showProfile); setShowNotifs(false); }}
            style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer" }}
          >
            <div className="avatar">{initials}</div>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>
                {user.firstName} {user.lastName}
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{user.role}{locationName ? ` · ${locationName.length > 20 ? locationName.slice(0, 20) + "…" : locationName}` : ""}</div>
            </div>
          </div>

          {/* Profile Dropdown */}
          {showProfile && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0, width: "200px",
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
              zIndex: 100, animation: "fadeUp 0.15s ease both", overflow: "hidden",
            }}>
              {[
                { label: "My Profile", href: "/settings" },
                { label: "Notification Settings", href: "/settings" },
              ].map(item => (
                <Link key={item.label} href={item.href} onClick={() => setShowProfile(false)} style={{
                  display: "block", padding: "0.65rem 1rem", fontSize: "0.82rem",
                  color: "var(--text-secondary)", textDecoration: "none",
                  borderBottom: "1px solid var(--border)", transition: "background 0.15s",
                }}>
                  {item.label}
                </Link>
              ))}
              <button onClick={() => {
                localStorage.removeItem("parker_location");
                setShowProfile(false);
                router.push("/select-location");
              }} style={{
                display: "block", width: "100%", padding: "0.65rem 1rem", fontSize: "0.82rem",
                color: "var(--accent)", background: "none", border: "none", cursor: "pointer",
                textAlign: "left", borderBottom: "1px solid var(--border)", transition: "background 0.15s",
              }}>
                Change Location
              </button>
              <button onClick={handleLogout} style={{
                display: "block", width: "100%", padding: "0.65rem 1rem", fontSize: "0.82rem",
                color: "var(--red)", background: "none", border: "none", cursor: "pointer",
                textAlign: "left", transition: "background 0.15s",
              }}>
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
