import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Parker OS | Smart Parking Platform",
  description: "AI-powered Smart Parking & Smart City infrastructure platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
