'use client';

// ==============================================================================
// Agent Chat UI — Shared chat interface for Driver and Ops agents
// ==============================================================================
// Usage:
//   <AgentChat agent="driver" />   — for driver-facing pages
//   <AgentChat agent="ops" />      — for admin/staff operator pages

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { driverAgent, opsAgent } from '../lib/api/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AgentChatProps {
  agent: 'driver' | 'ops';
  placeholder?: string;
  className?: string;
}

export function AgentChat({ agent, placeholder, className = '' }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const agentApi = agent === 'driver' ? driverAgent : opsAgent;
  const agentName = agent === 'driver' ? 'Parker' : 'Ops Copilot';
  const defaultPlaceholder =
    agent === 'driver'
      ? 'Ask about parking availability, pricing, or bookings...'
      : 'Ask about zone metrics, pricing, anomalies, or gate controls...';

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setError('');
    setMessages((prev) => [...prev, { role: 'user', content: text, timestamp: new Date() }]);
    setLoading(true);

    try {
      const result = await agentApi.chat(text, sessionId);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const { reply, session_id } = result.data;
      setSessionId(session_id);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply, timestamp: new Date() }]);
    } catch {
      setError('Failed to reach the AI agent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`agent-chat ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '400px',
        background: 'var(--surface, #0f172a)',
        borderRadius: '12px',
        border: '1px solid var(--border, rgba(255,255,255,0.08))',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '0.875rem 1rem',
          borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span style={{ fontSize: '1rem' }}>{agent === 'driver' ? '🚗' : '⚙️'}</span>
        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary, #f1f5f9)' }}>
          {agentName}
        </span>
        {loading && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '0.75rem',
              color: 'var(--text-secondary, #94a3b8)',
              animation: 'pulse 1.5s infinite',
            }}
          >
            Thinking…
          </span>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--text-secondary, #94a3b8)',
              fontSize: '0.85rem',
              marginTop: '2rem',
              opacity: 0.7,
            }}
          >
            Start a conversation with {agentName}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '0.625rem 0.875rem',
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background:
                  msg.role === 'user'
                    ? 'var(--accent, #6366f1)'
                    : 'var(--surface-alt, rgba(255,255,255,0.06))',
                color: 'var(--text-primary, #f1f5f9)',
                fontSize: '0.875rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              {msg.content}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #64748b)', marginTop: '0.2rem' }}>
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', paddingLeft: '0.25rem' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--text-secondary, #64748b)',
                  animation: `bounce 0.9s ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            margin: '0 1rem',
            padding: '0.5rem 0.75rem',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '6px',
            fontSize: '0.8rem',
            color: '#f87171',
          }}
        >
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border, rgba(255,255,255,0.08))' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder ?? defaultPlaceholder}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.625rem 0.875rem',
              background: 'var(--surface-alt, rgba(255,255,255,0.06))',
              border: '1px solid var(--border, rgba(255,255,255,0.12))',
              borderRadius: '8px',
              color: 'var(--text-primary, #f1f5f9)',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              padding: '0.625rem 1rem',
              background: 'var(--accent, #6366f1)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading || !input.trim() ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </div>
      </form>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
