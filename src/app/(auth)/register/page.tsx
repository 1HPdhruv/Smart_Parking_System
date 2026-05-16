"use client";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: "460px", animation: "fadeUp 0.5s ease both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
          <div className="nav-logo-mark">P</div>
          <span style={{ fontWeight: 700, letterSpacing: "-0.03em" }}>Parker<span style={{ color: "var(--accent)" }}>.</span></span>
        </div>
        <h2 style={{ marginBottom: "0.5rem" }}>Create an account</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "2rem" }}>
          Request operator access to the Parker platform.
        </p>
        <form style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>First Name</label>
              <input className="input" placeholder="Rahul" />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>Last Name</label>
              <input className="input" placeholder="Sharma" />
            </div>
          </div>
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>Email address</label>
            <input className="input" type="email" placeholder="operator@parker.io" />
          </div>
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>Role</label>
            <select className="input" style={{ cursor: "pointer" }}>
              <option value="">Select role...</option>
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>Password</label>
            <input className="input" type="password" placeholder="Min. 8 characters" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "0.75rem", fontSize: "0.9rem", marginTop: "0.5rem" }}>
            Create Account →
          </button>
        </form>
        <p style={{ textAlign: "center", fontSize: "0.83rem", color: "var(--text-muted)", marginTop: "1.5rem" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
