"use client";
import { useState, useEffect, useMemo } from "react";
import { io, Socket } from "socket.io-client";

type SlotStatus = "available" | "occupied" | "reserved" | "disabled";
interface BackendSlot { id: string; zoneId: string; status: SlotStatus; plate?: string; }
interface BackendZone { id: string; name: string; level: string; capacity: number; slots: BackendSlot[]; }
interface MapSlot extends BackendSlot { row: number; col: number; since?: string; fee?: string; }

export default function MapPage() {
  const [zones, setZones] = useState<BackendZone[]>([]);
  const [activeZone, setActiveZone] = useState<BackendZone | null>(null);
  const [hovered, setHovered] = useState<MapSlot | null>(null);
  const [selected, setSelected] = useState<MapSlot | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch initial zones and slots
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${apiUrl}/api/zones`);
        if (!res.ok) throw new Error("Failed to fetch zones");
        const data: BackendZone[] = await res.json();
        setZones(data);
        if (data.length > 0) setActiveZone(data[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchZones();
  }, []);

  // Handle WebSockets for real-time updates
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const socket: Socket = io(socketUrl);

    socket.on("SLOT_UPDATE", (data: { slotId: string; status: SlotStatus; plate?: string }) => {
      setZones(prevZones => prevZones.map(zone => ({
        ...zone,
        slots: zone.slots.map(slot => 
          slot.id === data.slotId 
            ? { ...slot, status: data.status, plate: data.plate } 
            : slot
        )
      })));
      
      // Update active zone if it was mutated
      setActiveZone(prev => {
        if (!prev) return null;
        return {
          ...prev,
          slots: prev.slots.map(slot => 
            slot.id === data.slotId 
              ? { ...slot, status: data.status, plate: data.plate } 
              : slot
          )
        };
      });

      // Update selected slot if it was the one that changed
      setSelected(prev => {
        if (!prev || prev.id !== data.slotId) return prev;
        return { ...prev, status: data.status, plate: data.plate };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Compute map grid for active zone
  const mapSlots: MapSlot[] = useMemo(() => {
    if (!activeZone) return [];
    const sorted = [...activeZone.slots].sort((a, b) => a.id.localeCompare(b.id));
    return sorted.map((slot, i) => ({
      ...slot,
      row: Math.floor(i / 10),
      col: i % 10,
      since: slot.status === "occupied" ? "Just now" : undefined,
      fee: slot.status === "occupied" ? "₹40" : undefined,
    }));
  }, [activeZone]);

  // The detail card shows the selected slot (click), or hovered slot as a preview
  const detailSlot = selected || hovered;

  const occupied  = mapSlots.filter(s => s.status === "occupied").length;
  const available = mapSlots.filter(s => s.status === "available").length;
  const reserved  = mapSlots.filter(s => s.status === "reserved").length;
  const disabled  = mapSlots.filter(s => s.status === "disabled").length;
  const pct = mapSlots.length > 0 ? Math.round((occupied / (mapSlots.length - disabled)) * 100) : 0;

  const slotColor = (s: SlotStatus, isSelected: boolean) => {
    const colors = {
      available: { bg: "var(--green-dim)",  border: "rgba(34,197,94,0.35)",  text: "var(--green)"  },
      occupied:  { bg: "var(--red-dim)",    border: "rgba(239,68,68,0.35)",   text: "var(--red)"    },
      reserved:  { bg: "var(--amber-dim)",  border: "rgba(245,158,11,0.35)", text: "var(--amber)"  },
      disabled:  { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.05)", text: "rgba(255,255,255,0.1)" },
    }[s] || { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.05)", text: "rgba(255,255,255,0.1)" };
    
    if (isSelected) {
      return { ...colors, border: "var(--accent)", bg: colors.bg };
    }
    return colors;
  };

  const handleSlotClick = (slot: MapSlot) => {
    if (slot.status === "disabled") return;
    // Toggle: click same slot to deselect
    setSelected(prev => prev?.id === slot.id ? null : slot);
  };

  if (loading) {
    return <div style={{ padding: "2rem", color: "var(--text-muted)" }}>Connecting to database...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", position: "relative" }}>

      {/* ── Controls ── */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        {/* Zone tabs */}
        <div style={{ display: "flex", gap: "4px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "3px" }}>
          {zones.map(z => (
            <button key={z.id} onClick={() => { setActiveZone(z); setSelected(null); }} style={{
              padding: "0.35rem 1rem", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 600,
              border: "none", cursor: "pointer", transition: "all 0.15s",
              background: activeZone?.id === z.id ? "var(--bg-hover)" : "transparent",
              color: activeZone?.id === z.id ? "var(--text-primary)" : "var(--text-muted)",
            }}>{z.name}</button>
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: "1rem" }}>
          <span className={`badge ${pct > 85 ? "badge-red" : pct > 60 ? "badge-amber" : "badge-green"}`}>{pct}% Occupied</span>
          <span className="badge badge-green">{available} Available</span>
          <span className="badge badge-amber">{reserved} Reserved</span>
        </div>
      </div>

      {/* ── Map + Sidebar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: "1.25rem" }}>

        {/* Floor Plan */}
        <div className="card" style={{ padding: "1.5rem", position: "relative" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
              {activeZone?.name || "Select Zone"} · {activeZone?.level} — Floor Plan
            </span>
            <span>10 columns × {Math.ceil(mapSlots.length / 10)} rows · {mapSlots.length} slots</span>
          </div>

          {/* Entry / Exit markers */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", padding: "0 0.25rem" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--green)", background: "var(--green-dim)", padding: "2px 8px", borderRadius: "4px", border: "1px solid rgba(34,197,94,0.3)" }}>▶ ENTRY</div>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--red)", background: "var(--red-dim)", padding: "2px 8px", borderRadius: "4px", border: "1px solid rgba(239,68,68,0.3)" }}>EXIT ▶</div>
          </div>

          {/* Driving lane + slot grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {Array.from({ length: Math.ceil(mapSlots.length / 10) }).map((_, row) => (
              <div key={row} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", width: "16px", textAlign: "center", fontWeight: 600 }}>
                  {String.fromCharCode(65 + row)}
                </span>
                
                {/* Top half of row */}
                <div style={{ display: "flex", gap: "5px", flex: 1 }}>
                  {mapSlots.filter(s => s.row === row).slice(0, 5).map(slot => {
                    const isSelected = selected?.id === slot.id;
                    const c = slotColor(slot.status, isSelected);
                    return (
                      <div
                        key={slot.id}
                        onClick={() => handleSlotClick(slot)}
                        onMouseEnter={() => setHovered(slot)}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                          flex: 1, height: "44px", borderRadius: "5px",
                          background: c.bg, border: `${isSelected ? "2px" : "1.5px"} solid ${c.border}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.58rem", fontWeight: 700, color: c.text,
                          cursor: slot.status !== "disabled" ? "pointer" : "default",
                          transition: "all 0.15s",
                          transform: isSelected ? "scale(1.08)" : "scale(1)",
                          boxShadow: isSelected ? "0 0 12px rgba(79,110,247,0.3)" : "none",
                        }}
                      >
                        {slot.status !== "disabled" ? slot.id : "—"}
                      </div>
                    );
                  })}
                </div>

                {/* Driving lane */}
                <div style={{ width: "28px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ height: "2px", width: "100%", background: "rgba(255,255,255,0.06)", position: "relative" }}>
                    <div style={{ position: "absolute", top: "-4px", left: "50%", transform: "translateX(-50%)", fontSize: "0.6rem", color: "var(--text-muted)" }}>⋯</div>
                  </div>
                </div>

                {/* Bottom half of row */}
                <div style={{ display: "flex", gap: "5px", flex: 1 }}>
                  {mapSlots.filter(s => s.row === row).slice(5, 10).map(slot => {
                    const isSelected = selected?.id === slot.id;
                    const c = slotColor(slot.status, isSelected);
                    return (
                      <div
                        key={slot.id}
                        onClick={() => handleSlotClick(slot)}
                        onMouseEnter={() => setHovered(slot)}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                          flex: 1, height: "44px", borderRadius: "5px",
                          background: c.bg, border: `${isSelected ? "2px" : "1.5px"} solid ${c.border}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.58rem", fontWeight: 700, color: c.text,
                          cursor: slot.status !== "disabled" ? "pointer" : "default",
                          transition: "all 0.15s",
                          transform: isSelected ? "scale(1.08)" : "scale(1)",
                          boxShadow: isSelected ? "0 0 12px rgba(79,110,247,0.3)" : "none",
                        }}
                      >
                        {slot.status !== "disabled" ? slot.id : "—"}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {mapSlots.length === 0 && (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                No slots found for this zone.
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="legend" style={{ marginTop: "1.25rem" }}>
            {[
              { color: "var(--green)", label: "Available" },
              { color: "var(--red)",   label: "Occupied"  },
              { color: "var(--amber)", label: "Reserved"  },
              { color: "rgba(255,255,255,0.15)", label: "Disabled" },
            ].map(l => (
              <div key={l.label} className="legend-item">
                <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: l.color, display: "inline-block" }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Zone stats */}
          <div className="card">
            <div className="section-title" style={{ marginBottom: "1rem" }}>Zone Stats</div>
            {[
              { label: "Total Slots",   val: mapSlots.length },
              { label: "Occupied",      val: occupied,  color: "var(--red)"   },
              { label: "Available",     val: available, color: "var(--green)" },
              { label: "Reserved",      val: reserved,  color: "var(--amber)" },
              { label: "Disabled",      val: disabled,  color: "var(--text-muted)" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.45rem 0", borderBottom: "1px solid var(--border)", fontSize: "0.82rem" }}>
                <span style={{ color: "var(--text-muted)" }}>{r.label}</span>
                <span style={{ fontWeight: 700, color: r.color ?? "var(--text-primary)" }}>{r.val}</span>
              </div>
            ))}
            <div style={{ marginTop: "1rem" }}>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct > 85 ? "var(--red)" : pct > 60 ? "var(--amber)" : "var(--green)" }} />
              </div>
              <div style={{ textAlign: "right", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>{pct}% occupancy</div>
            </div>
          </div>

          {/* Slot detail card — persists on click, previews on hover */}
          {detailSlot && detailSlot.status !== "disabled" ? (
            <div className="card" style={{ animation: "fadeUp 0.15s ease both", border: selected ? "1px solid var(--accent)" : undefined }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Slot {detailSlot.id}</span>
                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                  <span className={`badge badge-${detailSlot.status === "available" ? "green" : detailSlot.status === "occupied" ? "red" : "amber"}`} style={{ fontSize: "0.68rem" }}>
                    {detailSlot.status}
                  </span>
                  {selected && (
                    <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.9rem", padding: "0 2px" }}>✕</button>
                  )}
                </div>
              </div>
              {detailSlot.plate && (
                <div style={{ marginBottom: "0.5rem" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "2px" }}>Plate</div>
                  <div style={{ fontFamily: "monospace", color: "var(--accent)", fontWeight: 700 }}>{detailSlot.plate}</div>
                </div>
              )}
              {detailSlot.since && (
                <div style={{ marginBottom: "0.5rem" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "2px" }}>Parked since</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{detailSlot.since}</div>
                </div>
              )}
              {detailSlot.fee && (
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "2px" }}>Current fee</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--green)" }}>{detailSlot.fee}</div>
                </div>
              )}
              {detailSlot.status === "available" && (
                <button className="btn btn-accent" style={{ marginTop: "0.875rem", width: "100%", justifyContent: "center", fontSize: "0.8rem", padding: "0.45rem" }}>
                  Reserve Slot
                </button>
              )}
            </div>
          ) : (
            <div className="card" style={{ background: "transparent", border: "1px dashed var(--border)", textAlign: "center", padding: "2rem 1rem" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Click a slot<br />to view details &amp; actions</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
