"use client";
import { useState, useRef, useEffect, type FormEvent } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isError?: boolean;
}

const SUGGESTIONS = [
  "Get metrics for all zones for the past 24 hours",
  "Adjust Zone A pricing to ₹35/hour due to high demand",
  "Flag an occupancy mismatch anomaly in Zone C",
  "Retry the sensor zone_a_slot3 — it stopped reporting",
  "Dispatch staff to Zone B — urgent equipment issue",
  "Override gate zone_a_entry to open once for emergency access",
];

const TOOLS = [
  { icon: "📊", name: "get_zone_metrics", desc: "Read-only zone analytics" },
  { icon: "💰", name: "adjust_pricing", desc: "Dynamic tariff control" },
  { icon: "⚠️", name: "flag_anomaly", desc: "Log sensor/fraud anomalies" },
  { icon: "🔄", name: "retry_sensor", desc: "Reset malfunctioning sensors" },
  { icon: "🚧", name: "override_gate", desc: "Barrier control (approval required)" },
  { icon: "👷", name: "dispatch_staff", desc: "Send staff to zones" },
];

export default function OpsAgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm **Ops Copilot**, your AI operator assistant. I have full access to the parking management system.\n\nI can autonomously:\n• 📊 **Query zone metrics** and occupancy data\n• ⚠️ **Flag anomalies** and sensor issues\n• 👷 **Dispatch staff** to any zone\n\nActions requiring **admin approval**:\n• 💰 **Price adjustments** outside policy bounds\n• 🚧 **Gate overrides** without a valid booking\n\nAll my actions are logged to the audit trail. What do you need?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text, timestamp: new Date() }]);
    setInput("");
    setLoading(true);

    try {
      const token = localStorage.getItem("parker_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

      const res = await fetch(`${apiUrl}/api/ops-agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

      setSessionId(data.session_id);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, timestamp: new Date() },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ ${err.message || "Unable to reach the AI agent."}`,
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part.split("\n").map((line, j) => (
        <span key={`${i}-${j}`}>
          {line}
          {j < part.split("\n").length - 1 && <br />}
        </span>
      ));
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", maxHeight: "calc(100vh - 4rem)", gap: "1rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "10px",
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem", boxShadow: "0 0 20px rgba(34,197,94,0.35)",
          }}>
            ⚙️
          </div>
          <div>
            <h1 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1px" }}>Ops Copilot</h1>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Operations Agent · Admin Access
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span className="badge badge-amber" style={{ fontSize: "0.68rem" }}>Policy Engine Active</span>
          <span className="dot dot-green pulse" />
        </div>
      </div>

      <div style={{ display: "flex", gap: "1.25rem", flex: 1, minHeight: 0 }}>
        {/* Chat */}
        <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, padding: 0, overflow: "hidden" }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex", gap: "0.75rem",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  animation: "fadeUp 0.2s ease both",
                }}
              >
                <div style={{
                  width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem",
                  background: msg.role === "user"
                    ? "linear-gradient(135deg, #22c55e, #16a34a)"
                    : msg.isError ? "rgba(239,68,68,0.15)" : "var(--bg-elevated)",
                  border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
                  color: msg.role === "assistant" ? "var(--text-primary)" : "white",
                }}>
                  {msg.role === "user" ? "U" : "⚙️"}
                </div>
                <div style={{
                  maxWidth: "75%", padding: "0.75rem 1rem",
                  borderRadius: msg.role === "user" ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                  background: msg.role === "user"
                    ? "linear-gradient(135deg, #22c55e, #16a34a)"
                    : msg.isError ? "rgba(239,68,68,0.08)" : "var(--bg-surface)",
                  border: msg.role === "assistant"
                    ? msg.isError ? "1px solid rgba(239,68,68,0.25)" : "1px solid var(--border)"
                    : "none",
                  color: msg.role === "user" ? "white" : msg.isError ? "#f87171" : "var(--text-primary)",
                  fontSize: "0.875rem", lineHeight: 1.65,
                  boxShadow: msg.role === "user" ? "0 2px 12px rgba(34,197,94,0.2)" : "none",
                }}>
                  {renderContent(msg.content)}
                  <div style={{ fontSize: "0.65rem", marginTop: "0.4rem", opacity: 0.55, textAlign: msg.role === "user" ? "right" : "left" }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--bg-elevated)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>⚙️</div>
                <div style={{ padding: "0.875rem 1rem", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "4px 12px 12px 12px", display: "flex", gap: "4px", alignItems: "center" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--text-muted)", animation: `bounce 0.9s ${i * 0.15}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border)", background: "var(--bg-surface)" }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.625rem" }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Manage zones, pricing, sensors, gates..."
                disabled={loading}
                className="input"
                style={{ flex: 1, fontSize: "0.875rem" }}
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="btn btn-primary"
                style={{ padding: "0.625rem 1.25rem", fontSize: "0.875rem", opacity: loading || !input.trim() ? 0.5 : 1, cursor: loading || !input.trim() ? "not-allowed" : "pointer", whiteSpace: "nowrap", background: "linear-gradient(135deg, #22c55e, #16a34a)", border: "none" }}
              >
                {loading ? "..." : "Send →"}
              </button>
            </form>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ width: "240px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Quick suggestions */}
          <div className="card" style={{ padding: "1rem" }}>
            <div className="section-title" style={{ marginBottom: "0.75rem", fontSize: "0.78rem" }}>
              Try asking...
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  disabled={loading}
                  style={{
                    textAlign: "left", padding: "0.5rem 0.625rem", borderRadius: "var(--radius-md)",
                    background: "var(--bg-elevated)", border: "1px solid var(--border)",
                    color: "var(--text-secondary)", fontSize: "0.75rem",
                    cursor: loading ? "not-allowed" : "pointer", transition: "all 0.15s", lineHeight: 1.4,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Available tools */}
          <div className="card" style={{ padding: "1rem" }}>
            <div className="section-title" style={{ marginBottom: "0.75rem", fontSize: "0.78rem" }}>Agent Tools</div>
            {TOOLS.map((t) => (
              <div key={t.name} style={{ display: "flex", gap: "0.5rem", padding: "0.4rem 0", borderBottom: "1px solid var(--border)", alignItems: "flex-start" }}>
                <span style={{ fontSize: "0.85rem", marginTop: "1px" }}>{t.icon}</span>
                <div>
                  <div style={{ fontSize: "0.72rem", fontFamily: "monospace", color: "var(--accent)", fontWeight: 600 }}>{t.name}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
