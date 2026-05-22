"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const CITIES = [
  { name: "Chennai",    state: "Tamil Nadu",     active: true,  emoji: "🏛️" },
  { name: "Delhi",      state: "Delhi NCR",      active: false, emoji: "🏰" },
  { name: "Mumbai",     state: "Maharashtra",    active: false, emoji: "🌊" },
  { name: "Bengaluru",  state: "Karnataka",      active: false, emoji: "💻" },
  { name: "Kolkata",    state: "West Bengal",     active: false, emoji: "🌉" },
  { name: "Hyderabad",  state: "Telangana",      active: false, emoji: "🕌" },
  { name: "Pune",       state: "Maharashtra",    active: false, emoji: "🏔️" },
  { name: "Ahmedabad",  state: "Gujarat",        active: false, emoji: "🛕" },
  { name: "Jaipur",     state: "Rajasthan",      active: false, emoji: "🏜️" },
  { name: "Lucknow",    state: "Uttar Pradesh",  active: false, emoji: "🕌" },
  { name: "Chandigarh", state: "Punjab/Haryana", active: false, emoji: "🌳" },
  { name: "Kochi",      state: "Kerala",         active: false, emoji: "🌴" },
];

interface LocationItem {
  name: string;
  sub: string;
}

interface CategoryData {
  label: string;
  emoji: string;
  color: string;
  items: LocationItem[];
}

const CHENNAI_LOCATIONS: CategoryData[] = [
  {
    label: "Colleges", emoji: "🎓", color: "#4f6ef7",
    items: [
      { name: "SRM Institute of Science and Technology", sub: "Kattankulathur · 3,000+ parking slots" },
      { name: "Vellore Institute of Technology", sub: "Vandalur · 2,500+ slots" },
      { name: "Sathyabama Institute of Science and Technology", sub: "Jeppiaar Nagar · 1,800+ slots" },
      { name: "Hindustan Institute of Technology and Science", sub: "Padur · 1,200+ slots" },
      { name: "Anna University", sub: "Guindy · 2,000+ slots" },
      { name: "SSN College of Engineering", sub: "Kalavakkam · 1,500+ slots" },
      { name: "Saveetha Institute of Medical and Technical Sciences", sub: "Thandalam · 1,600+ slots" },
    ]
  },
  {
    label: "Malls", emoji: "🛍️", color: "#f59e0b",
    items: [
      { name: "Express Avenue", sub: "Royapettah · 2,200 car slots" },
      { name: "Phoenix Marketcity Chennai", sub: "Velachery · 3,500 car slots" },
      { name: "VR Chennai", sub: "Anna Nagar · 2,800 car slots" },
      { name: "Forum Vijaya Mall", sub: "Vadapalani · 1,500 car slots" },
      { name: "Spencer Plaza", sub: "Anna Salai · 800 car slots" },
    ]
  },
  {
    label: "IT Parks", emoji: "💻", color: "#22c55e",
    items: [
      { name: "DLF Cybercity Chennai", sub: "Mount Poonamallee · 4,000+ slots" },
      { name: "TIDEL Park", sub: "Taramani · 2,500 slots" },
      { name: "Olympia Tech Park", sub: "Guindy · 1,800 slots" },
      { name: "RMZ Millenia Business Park", sub: "Perungudi · 3,200 slots" },
    ]
  },
  {
    label: "Hospitals", emoji: "🏥", color: "#ef4444",
    items: [
      { name: "Apollo Hospitals", sub: "Greams Road · 600 slots" },
      { name: "MIOT International", sub: "Manapakkam · 500 slots" },
      { name: "Fortis Malar Hospital", sub: "Adyar · 350 slots" },
    ]
  },
  {
    label: "Transport Hubs", emoji: "🚂", color: "#a78bfa",
    items: [
      { name: "Chennai Central Railway Station", sub: "Park Town · 1,200 slots" },
      { name: "Chennai Egmore Railway Station", sub: "Egmore · 800 slots" },
      { name: "Chennai International Airport", sub: "Tirusulam · 3,000 slots" },
    ]
  },
  {
    label: "Apartment Communities", emoji: "🏘️", color: "#06b6d4",
    items: [
      { name: "Visitor Parking Management", sub: "Gated community visitor access" },
      { name: "Resident Slot Allocation", sub: "Assigned parking for residents" },
      { name: "QR-Based Parking Access", sub: "Security-integrated smart entry" },
    ]
  }
];

export default function SelectLocationPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState(0);

  // Skip if location already chosen
  useEffect(() => {
    const loc = localStorage.getItem("parker_location");
    if (loc) {
      router.push("/live");
    }
  }, [router]);

  const handleCityClick = (city: typeof CITIES[0]) => {
    if (!city.active) return;
    setSelectedCity(city.name);
    setStep(2);
  };

  const handleLocationSelect = (place: string, category: string) => {
    const locationData = { city: selectedCity, place, category };
    localStorage.setItem("parker_location", JSON.stringify(locationData));
    router.push("/live");
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", position: "relative", overflow: "hidden" }}>
      {/* Background glows */}
      <div className="glow glow-accent" style={{ width: "600px", height: "600px", top: "-200px", right: "-100px", opacity: 0.4 }} />
      <div className="glow glow-green" style={{ width: "400px", height: "400px", bottom: "-100px", left: "-50px", opacity: 0.3 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "960px", margin: "0 auto", padding: "2rem" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2.5rem", paddingTop: "1rem" }}>
          <div className="nav-logo-mark">P</div>
          <span style={{ fontWeight: 800, fontSize: "1.2rem", letterSpacing: "-0.03em" }}>Parker<span style={{ color: "var(--accent)" }}>.</span></span>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "2rem" }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.75rem", fontWeight: 700,
            background: "var(--accent)", color: "white",
          }}>1</div>
          <div style={{ width: "40px", height: "2px", background: step === 2 ? "var(--accent)" : "var(--border)" }} />
          <div style={{
            width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.75rem", fontWeight: 700,
            background: step === 2 ? "var(--accent)" : "var(--bg-elevated)", color: step === 2 ? "white" : "var(--text-muted)",
            border: step === 2 ? "none" : "1px solid var(--border)",
          }}>2</div>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
            {step === 1 ? "Select your city" : "Choose parking location"}
          </span>
        </div>

        {/* Step 1: City Selection */}
        {step === 1 && (
          <div style={{ animation: "fadeUp 0.3s ease both" }}>
            <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
              Where are you <span style={{ background: "linear-gradient(135deg, #4f6ef7, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>parking?</span>
            </h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", fontSize: "1rem" }}>
              Select your city to see available parking locations.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.875rem" }}>
              {CITIES.map(city => (
                <div
                  key={city.name}
                  onClick={() => handleCityClick(city)}
                  style={{
                    padding: "1.25rem", borderRadius: "var(--radius-lg)",
                    background: "var(--bg-surface)", border: "1px solid var(--border)",
                    cursor: city.active ? "pointer" : "default",
                    transition: "all 0.2s",
                    position: "relative", overflow: "hidden",
                    opacity: city.active ? 1 : 0.5,
                  }}
                >
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{city.emoji}</div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.15rem" }}>{city.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{city.state}</div>
                  {!city.active && (
                    <div style={{
                      position: "absolute", top: "0.625rem", right: "0.625rem",
                      fontSize: "0.6rem", fontWeight: 700, color: "var(--text-muted)",
                      background: "var(--bg-elevated)", border: "1px solid var(--border)",
                      borderRadius: "4px", padding: "2px 6px", textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>Coming Soon</div>
                  )}
                  {city.active && (
                    <div style={{
                      position: "absolute", top: "0.625rem", right: "0.625rem",
                      fontSize: "0.6rem", fontWeight: 700, color: "var(--green)",
                      background: "var(--green-dim)", border: "1px solid rgba(34,197,94,0.3)",
                      borderRadius: "4px", padding: "2px 6px", textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>Live</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Location Selection */}
        {step === 2 && selectedCity && (
          <div style={{ animation: "fadeUp 0.3s ease both" }}>
            <button
              onClick={() => { setStep(1); setSelectedCity(null); }}
              style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, marginBottom: "1rem", padding: 0 }}
            >
              ← Back to cities
            </button>
            <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
              Parking in <span style={{ background: "linear-gradient(135deg, #4f6ef7, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{selectedCity}</span>
            </h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", fontSize: "1rem" }}>
              Choose your parking location to get started.
            </p>

            {/* Category tabs */}
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "1.5rem", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "4px", width: "fit-content" }}>
              {CHENNAI_LOCATIONS.map((cat, i) => (
                <button
                  key={cat.label}
                  onClick={() => setActiveCategory(i)}
                  style={{
                    padding: "0.4rem 0.875rem", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600,
                    border: "none", cursor: "pointer", transition: "all 0.15s",
                    background: activeCategory === i ? "var(--bg-hover)" : "transparent",
                    color: activeCategory === i ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>

            {/* Location cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.875rem" }}>
              {CHENNAI_LOCATIONS[activeCategory].items.map(loc => (
                <div
                  key={loc.name}
                  onClick={() => handleLocationSelect(loc.name, CHENNAI_LOCATIONS[activeCategory].label)}
                  style={{
                    padding: "1.25rem", borderRadius: "var(--radius-lg)",
                    background: "var(--bg-surface)", border: "1px solid var(--border)",
                    cursor: "pointer", transition: "all 0.2s",
                    position: "relative",
                  }}
                >
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.1rem", marginBottom: "0.75rem",
                    background: `${CHENNAI_LOCATIONS[activeCategory].color}15`,
                    border: `1px solid ${CHENNAI_LOCATIONS[activeCategory].color}30`,
                  }}>
                    {CHENNAI_LOCATIONS[activeCategory].emoji}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.25rem", color: "var(--text-primary)" }}>{loc.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5 }}>{loc.sub}</div>
                  <div style={{
                    position: "absolute", top: "50%", right: "1rem", transform: "translateY(-50%)",
                    color: "var(--text-muted)", fontSize: "1rem",
                  }}>→</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
