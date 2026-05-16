import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg-base)" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", position: "relative" }}>
        {/* Background glow */}
        <div className="glow glow-accent" style={{ width: "600px", height: "600px", top: "-200px", right: "-100px", opacity: 0.4 }} />
        <Header />
        <main style={{ flex: 1, overflowY: "auto", padding: "1.5rem", position: "relative", zIndex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
