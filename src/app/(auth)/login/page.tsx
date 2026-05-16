"use client";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTimeout(() => {
      setLoading(false);
      setError("Invalid credentials. Please try again.");
    }, 1500);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>
      {/* Left — Brand */}
      <div style={{
        flex: "0 0 45%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "4rem",
        background: "linear-gradient(135deg, rgba(79,110,247,0.12) 0%, rgba(9,9,11,0) 60%)",
        borderRight: "1px solid var(--border)", position: "relative", overflow: "hidden",
      }}>
        <div className="glow glow-accent" style={{ width: "400px", height: "400px", top: "-100px", left: "-100px", opacity: 0.5 }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "3rem" }}>
            <div className="nav-logo-mark" style={{ width: "40px", height: "40px", fontSize: "1.1rem" }}>P</div>
            <span style={{ fontWeight: 800, fontSize: "1.2rem", letterSpacing: "-0.03em" }}>Parker<span style={{ color: "var(--accent)" }}>.</span></span>
          </div>
          <h1 style={{ fontSize: "clamp(2rem,4vw,3rem)", marginBottom: "1.25rem", lineHeight: 1.1 }}>
            Smart Parking<br />Management<br />
            <span style={{ background: "linear-gradient(135deg,#4f6ef7,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Operating System.
            </span>
          </h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: "340px" }}>
            Real-time telemetry, ANPR enforcement, and predictive analytics — all in one command center.
          </p>
          <div style={{ marginTop: "3rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {["99.97% Uptime SLA","Sub-12ms sensor latency","Enterprise-grade security"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: "0.625rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                <span style={{ color: "var(--green)" }}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ width: "100%", maxWidth: "400px", animation: "fadeUp 0.5s ease both" }}>
          <h2 style={{ marginBottom: "0.5rem" }}>Sign in to Parker</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "2rem" }}>
            Enter your credentials to access the platform.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>Email address</label>
              <input className="input" type="email" placeholder="operator@parker.io" required />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>Password</label>
                <a href="#" style={{ fontSize: "0.78rem", color: "var(--accent)" }}>Forgot password?</a>
              </div>
              <div style={{ position: "relative" }}>
                <input className="input" type={show ? "text" : "password"} placeholder="••••••••" required style={{ paddingRight: "2.5rem" }} />
                <button type="button" onClick={() => setShow(v => !v)} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem" }}>
                  {show ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" id="remember" style={{ accentColor: "var(--accent)", width: "14px", height: "14px" }} />
              <label htmlFor="remember" style={{ fontSize: "0.82rem", color: "var(--text-secondary)", cursor: "pointer" }}>Remember me for 30 days</label>
            </div>

            {error && (
              <div style={{ background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-md)", padding: "0.625rem 0.875rem", fontSize: "0.82rem", color: "var(--red)" }}>
                {error}
              </div>
            )}

            <Link href="/live">
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "0.75rem", fontSize: "0.9rem", opacity: loading ? 0.7 : 1 }}
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in →"}
              </button>
            </Link>
          </form>

          <div style={{ margin: "1.5rem 0", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>or</span>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          </div>

          <p style={{ textAlign: "center", fontSize: "0.83rem", color: "var(--text-muted)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" style={{ color: "var(--accent)", fontWeight: 600 }}>Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
