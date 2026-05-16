"use client";
import Link from "next/link";

const features = [
  { icon: "⬡", label: "Real-time Occupancy", desc: "Live slot monitoring with sub-second WebSocket updates across all zones and levels." },
  { icon: "◎", label: "ANPR Recognition",    desc: "Automatic Number Plate Recognition for seamless, ticketless entry and exit." },
  { icon: "▲", label: "Predictive Analytics", desc: "AI-driven demand forecasting and dynamic pricing that maximises revenue." },
  { icon: "⬡", label: "IoT Telemetry",        desc: "MQTT sensor feeds from thousands of in-ground sensors visualised live." },
  { icon: "◈", label: "Dynamic Pricing",       desc: "Rule-based and ML-driven tariff engines that respond to occupancy in real time." },
  { icon: "◇", label: "Operator Controls",     desc: "Full admin panel: manage staff, zones, barriers, and pricing from one view." },
];

const stats = [
  { value: "99.97%", label: "Uptime SLA" },
  { value: "<12ms",  label: "Sensor Latency" },
  { value: "50k+",   label: "Slots Managed" },
  { value: "3.4M",   label: "Sessions / year" },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", overflowX: "hidden" }}>

      {/* ── Navbar ── */}
      <nav className="topnav animate-fade-in">
        <div className="nav-logo">
          <div className="nav-logo-mark">P</div>
          <span className="nav-logo-text">Parker<span style={{ color: "var(--accent)" }}>.</span></span>
        </div>
        <div className="nav-links" style={{ display: "flex", gap: "2rem" }}>
          {["Features","Solutions","Pricing","Docs"].map(n => (
            <a key={n} href="#" className="nav-link">{n}</a>
          ))}
        </div>
        <div className="nav-actions">
          <Link href="/live" className="btn btn-ghost" style={{ padding: "0.45rem 1rem", fontSize: "0.82rem" }}>Log in</Link>
          <Link href="/live" className="btn btn-primary" style={{ padding: "0.45rem 1rem", fontSize: "0.82rem" }}>
            Dashboard →
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ paddingTop: "130px", paddingBottom: "80px", position: "relative", textAlign: "center" }}>
        {/* glows */}
        <div className="glow glow-accent" style={{ width: "700px", height: "700px", top: "-200px", left: "50%", transform: "translateX(-50%)", opacity: 0.6 }} />
        <div className="glow glow-green"  style={{ width: "400px", height: "400px", bottom: "-100px", right: "10%", opacity: 0.5 }} />

        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div className="animate-fade-up" style={{ marginBottom: "1.5rem" }}>
            <span className="badge badge-accent">
              <span className="dot dot-accent pulse" style={{ width: "6px", height: "6px" }} />
              System Status: All Zones Operational
            </span>
          </div>

          <h1 className="animate-fade-up-1" style={{ marginBottom: "1.5rem" }}>
            The Operating System<br />
            <span style={{ background: "linear-gradient(135deg, #4f6ef7, #818cf8, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              for Smart Cities.
            </span>
          </h1>

          <p className="animate-fade-up-2" style={{ maxWidth: "560px", margin: "0 auto 2.5rem", fontSize: "1.1rem", lineHeight: "1.8" }}>
            Parker unifies IoT telemetry, ANPR enforcement, and predictive pricing into one blazing-fast management platform. Built for operators who demand perfection.
          </p>

          <div className="animate-fade-up-3" style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/live" className="btn btn-primary" style={{ padding: "0.75rem 1.75rem", fontSize: "0.95rem" }}>
              Enter Dashboard →
            </Link>
            <Link href="/live" className="btn btn-ghost" style={{ padding: "0.75rem 1.75rem", fontSize: "0.95rem" }}>
              Watch Demo
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ padding: "2rem 0 4rem" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1px", background: "var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--border)" }}>
            {stats.map((s, i) => (
              <div key={i} style={{ background: "var(--bg-surface)", padding: "2rem", textAlign: "center" }}>
                <div style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text-primary)", marginBottom: "0.35rem" }}>{s.value}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: "4rem 0 6rem" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ marginBottom: "0.75rem" }}>Everything in one platform</h2>
            <p style={{ maxWidth: "480px", margin: "0 auto" }}>
              Designed for enterprise operators. Built to scale from one car park to an entire city network.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1rem" }}>
            {features.map((f, i) => (
              <div key={i} className="card" style={{ position: "relative", overflow: "hidden" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "var(--accent)", lineHeight: 1 }}>{f.icon}</div>
                <h3 style={{ marginBottom: "0.5rem", fontSize: "0.95rem" }}>{f.label}</h3>
                <p style={{ fontSize: "0.85rem", lineHeight: "1.7" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "4rem 0 6rem" }}>
        <div className="container">
          <div style={{ background: "linear-gradient(135deg, rgba(79,110,247,0.15), rgba(129,140,248,0.08))", border: "1px solid rgba(79,110,247,0.25)", borderRadius: "var(--radius-xl)", padding: "4rem 2rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div className="glow glow-accent" style={{ width: "500px", height: "500px", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <h2 style={{ marginBottom: "1rem", fontSize: "clamp(1.8rem,4vw,2.8rem)" }}>Ready to take control?</h2>
              <p style={{ marginBottom: "2.5rem", maxWidth: "440px", margin: "0 auto 2rem" }}>
                Join the operators using Parker OS to manage smarter, earn more, and scale faster.
              </p>
              <Link href="/live" className="btn btn-accent" style={{ padding: "0.8rem 2rem", fontSize: "1rem" }}>
                Start with Live Dashboard →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div className="nav-logo-mark" style={{ width: "24px", height: "24px", fontSize: "0.75rem" }}>P</div>
          <span style={{ fontWeight: 600 }}>Parker OS</span>
        </div>
        <span>© 2025 Parker Systems. All rights reserved.</span>
      </footer>
    </div>
  );
}
