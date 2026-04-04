import "dotenv/config";
import "./mongooseInit.js";
import path from "node:path";
import { fileURLToPath } from "node:url";


import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";

// ❌ Removed: import "./mongooseInit.js" — was running before dotenv, causing MONGO_URI to be undefined

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI?.trim();

if (!MONGO_URI) {
  console.error(
    "❌ MONGO_URI is missing. Create backend/.env with MONGO_URI (see .env.example)."
  );
  process.exit(1);
}

const requireMongo = (req, res, next) => {
  if (mongoose.connection.readyState === 1) return next();
  res.status(503).json({
    message:
      "Database is not connected. If the server just restarted, wait a moment and retry; otherwise check MONGO_URI and that MongoDB is reachable.",
  });
};

/** MongoDB Connection */
mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  bufferCommands: false,
  maxPoolSize: 10,
  socketTimeoutMS: 45000,
  heartbeatFrequencyMS: 10000,
  })
  .then(() => {
    console.log("MongoDB connected ✅");

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

/** Debug Logs */
mongoose.connection.on("connected", () => console.log("Mongoose connected"));
mongoose.connection.on("error", (err) => console.error("Mongoose error:", err));

mongoose.connection.on("disconnected", (reason) => {
  console.error("❌ Mongoose DISCONNECTED at:", new Date().toISOString(), reason);
});

mongoose.connection.on("close", () => {
  console.error("❌ Mongoose CLOSED at:", new Date().toISOString());
});

app.use((req, res, next) => {
  console.log("Mongo readyState on request:", mongoose.connection.readyState);
  next();
});

/** Routes */
app.get("/", (req, res) => {
  res.send("Skill Development API is running...");
});

app.get("/health", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    ok: true,
    mongo: states[mongoose.connection.readyState] || "unknown",
    apiReady: mongoose.connection.readyState === 1,
  });
});

// ✅ requireMongo middleware must come BEFORE route handlers
app.use("/api", requireMongo);
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/applications", applicationRoutes);

/** 404 Handler */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

/** Global Error Handler */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "An error occurred",
    error: err.message,
  });
});