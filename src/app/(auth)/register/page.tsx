"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "driver",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${apiUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to register");
      }

      // Auto-login after registration
      localStorage.setItem("parker_token", data.access_token);
      localStorage.setItem("parker_refresh", data.refresh_token);
      localStorage.setItem("parker_user", JSON.stringify(data.user));

      router.push("/select-location");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>First Name</label>
              <input className="input" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Rahul" required />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>Last Name</label>
              <input className="input" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Sharma" required />
            </div>
          </div>
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>Email address</label>
            <input className="input" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="operator@parker.io" required />
          </div>
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>Role</label>
            <select className="input" name="role" value={formData.role} onChange={handleChange} style={{ cursor: "pointer" }} required>
              <option value="driver">Driver</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>Password</label>
            <input className="input" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Min. 8 characters" minLength={8} required />
          </div>

          {error && (
            <div style={{ background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-md)", padding: "0.625rem 0.875rem", fontSize: "0.82rem", color: "var(--red)" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "0.75rem", fontSize: "0.9rem", marginTop: "0.5rem", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Creating Account..." : "Create Account →"}
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
