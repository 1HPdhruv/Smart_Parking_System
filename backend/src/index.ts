import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "parker-os-super-secret-key-2026";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // allow Next.js frontend
    methods: ["GET", "POST"]
  }
});
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

/* ── REST Endpoints ── */

/* ── Auth Endpoints ── */
app.post("/api/auth/register", async (req, res): Promise<any> => {
  const { firstName, lastName, email, password, role } = req.body;
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { firstName, lastName, email, password: hashedPassword, role: role || "viewer" }
    });
    res.status(201).json({ message: "User registered successfully", userId: user.id });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res): Promise<any> => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { firstName, lastName, email }
    });
    res.json({ message: "Profile updated successfully", user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role } });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

app.get("/", (req, res) => {
  res.send("Parker OS Backend API is running! 🚗");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.get("/api/zones", async (req, res) => {
  try {
    const zones = await prisma.zone.findMany({
      include: { slots: true }
    });
    res.json(zones);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch zones" });
  }
});

// Webhook endpoint: Called by physical ANPR cameras or in-ground sensors
app.post("/api/webhooks/sensor", async (req, res): Promise<any> => {
  const { slotId, status, plate, action } = req.body;
  
  try {
    let zoneId = "UNKNOWN";

    // 1. Update the database slot
    if (slotId && status) {
      const slot = await prisma.slot.update({
        where: { id: slotId },
        data: { status },
        include: { zone: true }
      });
      zoneId = slot.zoneId;
      // 2. Broadcast to all connected frontends instantly
      io.emit("SLOT_UPDATE", { slotId, status, plate });
    }

    if (action === "ENTRY" || action === "EXIT") {
      // Save ANPR Log
      await prisma.aNPRLog.create({
        data: { plate, action, zoneId }
      });

      if (action === "ENTRY") {
        await prisma.session.create({
          data: { plate, slotId, status: "ACTIVE" }
        });
      } else if (action === "EXIT") {
        // Complete the session and calculate fee
        const activeSession = await prisma.session.findFirst({
          where: { plate, status: "ACTIVE" },
          orderBy: { entryTime: "desc" }
        });

        if (activeSession) {
          const exitTime = new Date();
          const durationHours = (exitTime.getTime() - activeSession.entryTime.getTime()) / (1000 * 60 * 60);
          const fee = Math.max(1, Math.ceil(durationHours)) * 50; // Minimum ₹50, then ₹50/hr

          await prisma.session.update({
            where: { id: activeSession.id },
            data: { exitTime, fee, status: "COMPLETED" }
          });
        }
      }

      io.emit("ANPR_EVENT", { plate, action, timestamp: new Date(), slotId });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

app.get("/api/vehicles/sessions", async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { entryTime: "desc" },
      include: {
        slot: {
          include: { zone: true }
        }
      },
      take: 100
    });
    res.json(sessions);
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

app.get("/api/analytics", async (req, res) => {
  try {
    const aggregations = await prisma.session.aggregate({
      _sum: { fee: true },
      _count: { id: true }
    });
    
    const totalRevenue = aggregations._sum.fee || 0;
    const totalSessions = aggregations._count.id || 0;
    const avgRevenue = totalSessions > 0 ? Math.round(totalRevenue / totalSessions) : 0;

    const completedSessions = await prisma.session.findMany({
      where: { status: "COMPLETED", exitTime: { not: null } },
      select: { entryTime: true, exitTime: true }
    });

    const dwellBuckets = { "<15m": 0, "15–30m": 0, "30–60m": 0, "1–2h": 0, "2–4h": 0, "4h+": 0 };
    let totalDwellMinutes = 0;

    completedSessions.forEach(s => {
      const mins = Math.floor((s.exitTime!.getTime() - s.entryTime.getTime()) / 60000);
      totalDwellMinutes += mins;
      if (mins < 15) dwellBuckets["<15m"]++;
      else if (mins < 30) dwellBuckets["15–30m"]++;
      else if (mins < 60) dwellBuckets["30–60m"]++;
      else if (mins < 120) dwellBuckets["1–2h"]++;
      else if (mins < 240) dwellBuckets["2–4h"]++;
      else dwellBuckets["4h+"]++;
    });

    const avgDwellTime = completedSessions.length > 0 ? Math.round(totalDwellMinutes / completedSessions.length) : 0;

    const topVehiclesQuery = await prisma.session.groupBy({
      by: ['plate'],
      _sum: { fee: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    });

    const topVehicles = topVehiclesQuery.map(v => ({
      plate: v.plate,
      sessions: v._count.id,
      revenue: v._sum.fee || 0
    }));

    res.json({
      kpis: { totalRevenue, totalSessions, avgRevenue, avgDwellTime },
      dwellTimeData: Object.entries(dwellBuckets).map(([bucket, count]) => ({ bucket, count })),
      topVehicles
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

app.get("/api/finance", async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const completedSessions = await prisma.session.findMany({
      where: { status: "COMPLETED", exitTime: { not: null } },
      include: { slot: { include: { zone: true } } },
      orderBy: { exitTime: "desc" }
    });

    let revToday = 0;
    let revWeek = 0;
    let revMonth = 0;
    let totalRev = 0;
    const zoneMap: Record<string, { revenue: number, sessions: number }> = {};

    completedSessions.forEach(s => {
      const exit = s.exitTime!;
      const fee = s.fee || 0;
      
      totalRev += fee;
      if (exit >= startOfDay) revToday += fee;
      if (exit >= startOfWeek) revWeek += fee;
      if (exit >= startOfMonth) revMonth += fee;

      const zoneName = s.slot?.zone?.name || "Unknown";
      if (!zoneMap[zoneName]) zoneMap[zoneName] = { revenue: 0, sessions: 0 };
      zoneMap[zoneName].revenue += fee;
      zoneMap[zoneName].sessions += 1;
    });

    const avgFee = completedSessions.length > 0 ? Math.round(totalRev / completedSessions.length) : 0;
    const zoneRevenue = Object.entries(zoneMap).map(([zone, data]) => ({
      zone, revenue: data.revenue, sessions: data.sessions
    }));

    const transactions = completedSessions.slice(0, 50).map(s => {
      const durationMins = Math.floor((s.exitTime!.getTime() - s.entryTime.getTime()) / 60000);
      const hrs = Math.floor(durationMins / 60);
      const mins = durationMins % 60;
      return {
        id: `TXN-${s.id.slice(18).toUpperCase()}`, // generate pseudo txn ID from cuid
        plate: s.plate,
        zone: s.slot ? `${s.slot.zone.name} · ${s.slot.id}` : "Unknown",
        entry: s.entryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        exit: s.exitTime!.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`,
        fee: s.fee,
        method: "UPI", // simulated payment method
        date: s.exitTime!.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
    });

    res.json({
      kpis: { revToday, revWeek, revMonth, avgFee },
      zoneRevenue,
      transactions
    });
  } catch (error) {
    console.error("Finance API error:", error);
    res.status(500).json({ error: "Failed to load financial data" });
  }
});

/* ── WebSockets ── */

io.on("connection", (socket) => {
  console.log(`[Socket] Dashboard connected: ${socket.id}`);
  
  socket.on("disconnect", () => {
    console.log(`[Socket] Dashboard disconnected: ${socket.id}`);
  });
});

/* ── Start Server ── */
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`[Parker Backend] Server running on http://localhost:${PORT}`);
});
