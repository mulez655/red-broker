// server/src/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";

// ROUTES (adjust paths/names to match your project)
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import adminAuthRoutes from "./routes/admin.routes.js"; // /api/admin/login
import adminUsersRoutes from "./routes/admin.users.routes.js"; // /api/admin/users

const app = express();

const PORT = process.env.PORT || 4000;

// ---------- CORS ----------
const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://127.0.0.1:5501",
  "http://localhost:5500",
  "http://localhost:5501"
];

// Allow extra origin from env (for hosting)
if (process.env.CORS_ORIGIN) {
  // Support comma-separated list
  process.env.CORS_ORIGIN.split(",").forEach((o) => {
    const origin = o.trim();
    if (origin) allowedOrigins.push(origin);
  });
}

app.use(
  cors({
    origin: (origin, cb) => {
      // allow requests with no origin (Postman, server-to-server)
      if (!origin) return cb(null, true);

      if (allowedOrigins.includes(origin)) return cb(null, true);

      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true
  })
);

// ---------- MIDDLEWARE ----------
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "red-broker-backend" });
});

// ---------- ROUTES ----------
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

// Admin auth (env-based) + admin data routes
app.use("/api/admin", adminAuthRoutes);   // provides POST /api/admin/login
app.use("/api/admin", adminUsersRoutes);  // provides GET  /api/admin/users

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ---------- ERROR HANDLER ----------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error" });
});

app.listen(PORT, () => {
  console.log(`✅ API running on http://localhost:${PORT}`);
});
