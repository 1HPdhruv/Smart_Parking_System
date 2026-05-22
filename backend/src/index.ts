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
app.post("/api/webhooks/sensor", async (req, res) => {
  const { slotId, status, plate, action } = req.body;
  
  try {
    // 1. Update the database
    if (slotId && status) {
      await prisma.slot.update({
        where: { id: slotId },
        data: { status }
      });
      // 2. Broadcast to all connected frontends instantly
      io.emit("SLOT_UPDATE", { slotId, status, plate });
    }

    if (action === "ENTRY" || action === "EXIT") {
      io.emit("ANPR_EVENT", { plate, action, timestamp: new Date(), slotId });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
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
