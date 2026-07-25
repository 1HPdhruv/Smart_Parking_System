"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/live",      label: "Live Dashboard",   icon: "⬡" },
  { href: "/map",       label: "Occupancy Map",     icon: "◎" },
  { href: "/analytics", label: "Analytics",         icon: "▲" },
  { href: "/vehicles",  label: "Vehicles & ANPR",   icon: "◈" },
  { href: "/finance",   label: "Financials",        icon: "◇" },
  { href: "/admin",     label: "Admin Panel",       icon: "⬕" },
  { href: "/operators", label: "Operators",         icon: "○" },
  { href: "/settings",  label: "Settings",          icon: "◻" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <Link href="/" style={{ textDecoration: "none" }}>
        <div className="sidebar-logo" style={{ cursor: "pointer", transition: "opacity 0.15s" }}>
          <div className="nav-logo-mark">P</div>
          <span className="nav-logo-text">Parker<span style={{ color: "var(--accent)" }}>.</span></span>
        </div>
      </Link>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {navItems.slice(0, 5).map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${active ? " active" : ""}`}
            >
              <span style={{ fontSize: "1rem", width: "18px", textAlign: "center", lineHeight: 1 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {/* ── AI Agents section ── */}
        <div className="nav-section-label" style={{ marginTop: "0.75rem" }}>AI Agents</div>

        <Link
          href="/agent"
          className={`nav-item${pathname === "/agent" ? " active" : ""}`}
          style={pathname === "/agent" ? {} : { color: "var(--text-secondary)" }}
        >
          <span style={{
            fontSize: "0.85rem", width: "18px", textAlign: "center", lineHeight: 1,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>🚗</span>
          Parker AI
          <span style={{
            marginLeft: "auto", fontSize: "0.58rem", fontWeight: 700,
            background: "rgba(79,110,247,0.15)", color: "var(--accent)",
            border: "1px solid rgba(79,110,247,0.3)", borderRadius: "4px",
            padding: "1px 5px", letterSpacing: "0.04em", textTransform: "uppercase",
          }}>Driver</span>
        </Link>

        <Link
          href="/ops-agent"
          className={`nav-item${pathname === "/ops-agent" ? " active" : ""}`}
          style={pathname === "/ops-agent" ? {} : { color: "var(--text-secondary)" }}
        >
          <span style={{
            fontSize: "0.85rem", width: "18px", textAlign: "center", lineHeight: 1,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>⚙️</span>
          Ops Copilot
          <span style={{
            marginLeft: "auto", fontSize: "0.58rem", fontWeight: 700,
            background: "rgba(34,197,94,0.12)", color: "var(--green)",
            border: "1px solid rgba(34,197,94,0.25)", borderRadius: "4px",
            padding: "1px 5px", letterSpacing: "0.04em", textTransform: "uppercase",
          }}>Admin</span>
        </Link>

        <div className="nav-section-label" style={{ marginTop: "0.75rem" }}>Management</div>
        {navItems.slice(5).map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${active ? " active" : ""}`}
            >
              <span style={{ fontSize: "1rem", width: "18px", textAlign: "center", lineHeight: 1 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sys-status">
          <span className="dot dot-green pulse" />
          <div>
            <div className="sys-status-text">System Online</div>
            <div className="sys-status-sub">Latency: 12ms · All zones OK</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
