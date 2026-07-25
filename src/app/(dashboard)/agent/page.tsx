"use client";
import { useState, useRef, useEffect, type FormEvent } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isError?: boolean;
}

const SUGGESTIONS = [
  "Find me a parking spot near the Main Block for 2 hours",
  "What's the price for Zone A from 9 AM to 6 PM?",
  "Show me available bike slots in Zone C",
  "How do I get directions to Zone B — Tech Park?",
  "Cancel my current booking",
  "Extend my booking by 1 hour",
];

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm **Parker**, your AI parking assistant for SRMIST KTR campus. I can help you:\n\n• 🔍 **Find & book** parking slots\n• 💰 **Get price quotes** before confirming\n• 🗺️ **Get directions** to any zone\n• ✏️ **Extend or cancel** your bookings\n• 📋 **Report issues** with parking facilities\n\nWhat can I help you with today?",
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

    const userMsg: Message = { role: "user", content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const token = localStorage.getItem("parker_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

      const res = await fetch(`${apiUrl}/api/driver-agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server error ${res.status}`);
      }

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
          content: `⚠️ ${err.message || "Unable to reach the AI agent. Please try again."}`,
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

  // Render markdown-lite: bold, newlines
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: "calc(100vh - 4rem)",
        gap: "1rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #4f6ef7, #818cf8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
                boxShadow: "0 0 20px rgba(79,110,247,0.4)",
              }}
            >
              🚗
            </div>
            <div>
              <h1 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1px" }}>
                Parker AI
              </h1>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Driver Agent · SRMIST KTR Campus
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="dot dot-green pulse" />
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Powered by Gemini
          </span>
        </div>
      </div>

      {/* Main chat area */}
      <div style={{ display: "flex", gap: "1.25rem", flex: 1, minHeight: 0 }}>
        {/* Chat window */}
        <div
          className="card"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            padding: 0,
            overflow: "hidden",
          }}
        >
          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  animation: "fadeUp 0.2s ease both",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.85rem",
                    background:
                      msg.role === "user"
                        ? "linear-gradient(135deg, #4f6ef7, #818cf8)"
                        : msg.isError
                        ? "rgba(239,68,68,0.15)"
                        : "var(--bg-elevated)",
                    border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
                    color: msg.role === "assistant" ? "var(--text-primary)" : "white",
                  }}
                >
                  {msg.role === "user" ? "U" : "🚗"}
                </div>

                {/* Bubble */}
                <div
                  style={{
                    maxWidth: "75%",
                    padding: "0.75rem 1rem",
                    borderRadius:
                      msg.role === "user" ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                    background:
                      msg.role === "user"
                        ? "linear-gradient(135deg, #4f6ef7, #6366f1)"
                        : msg.isError
                        ? "rgba(239,68,68,0.08)"
                        : "var(--bg-surface)",
                    border:
                      msg.role === "assistant"
                        ? msg.isError
                          ? "1px solid rgba(239,68,68,0.25)"
                          : "1px solid var(--border)"
                        : "none",
                    color: msg.role === "user" ? "white" : msg.isError ? "#f87171" : "var(--text-primary)",
                    fontSize: "0.875rem",
                    lineHeight: 1.65,
                    boxShadow:
                      msg.role === "user" ? "0 2px 12px rgba(79,110,247,0.25)" : "none",
                  }}
                >
                  {renderContent(msg.content)}
                  <div
                    style={{
                      fontSize: "0.65rem",
                      marginTop: "0.4rem",
                      opacity: 0.55,
                      textAlign: msg.role === "user" ? "right" : "left",
                    }}
                  >
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.85rem",
                  }}
                >
                  🚗
                </div>
                <div
                  style={{
                    padding: "0.875rem 1rem",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "4px 12px 12px 12px",
                    display: "flex",
                    gap: "4px",
                    alignItems: "center",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "var(--text-muted)",
                        animation: `bounce 0.9s ${i * 0.15}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: "1rem 1.25rem",
              borderTop: "1px solid var(--border)",
              background: "var(--bg-surface)",
            }}
          >
            <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.625rem" }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about parking, pricing, or bookings..."
                disabled={loading}
                className="input"
                style={{ flex: 1, fontSize: "0.875rem" }}
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="btn btn-primary"
                style={{
                  padding: "0.625rem 1.25rem",
                  fontSize: "0.875rem",
                  opacity: loading || !input.trim() ? 0.5 : 1,
                  cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {loading ? "..." : "Send →"}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar: suggestions + info */}
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
                    textAlign: "left",
                    padding: "0.5rem 0.625rem",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    fontSize: "0.75rem",
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "all 0.15s",
                    lineHeight: 1.4,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Zones info */}
          <div className="card" style={{ padding: "1rem" }}>
            <div className="section-title" style={{ marginBottom: "0.75rem", fontSize: "0.78rem" }}>
              Available Zones
            </div>
            {[
              { id: "A", name: "Main Block", rate: "₹30/hr", color: "#4f6ef7" },
              { id: "B", name: "Tech Park", rate: "₹25/hr", color: "#22c55e" },
              { id: "C", name: "Hostel Area", rate: "₹20/hr", color: "#f59e0b" },
              { id: "D", name: "Sports Complex", rate: "₹15/hr", color: "#a78bfa" },
            ].map((z) => (
              <div
                key={z.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  padding: "0.5rem 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    background: `${z.color}18`,
                    border: `1px solid ${z.color}35`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: z.color,
                    flexShrink: 0,
                  }}
                >
                  {z.id}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    {z.name}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{z.rate}</div>
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
