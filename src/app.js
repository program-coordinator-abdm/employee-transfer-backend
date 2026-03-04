const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const exportRoutes = require("./routes/exportRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const vacancyRoutes = require("./routes/vacancyRoutes");
const reportRoutes = require("./routes/reportRoutes");
const errorHandler = require("./middlewares/errorHandler");
const { AppError } = require("./utils/errors");
const app = express();
app.set("etag", false);

const defaultOrigins = ["http://localhost:5173", "http://localhost:8080"];
const configuredOrigins = [
  process.env.CORS_ORIGIN || "",
  process.env.VERCEL_FRONTEND_URL || "",
  process.env.CUSTOM_FRONTEND_URL || "",
]
  .join(",")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowVercelPreviewOrigins =
  String(process.env.ALLOW_VERCEL_PREVIEW_ORIGINS || "true").toLowerCase() ===
  "true";
const origins = new Set(
  (configuredOrigins.length > 0
    ? [...defaultOrigins, ...configuredOrigins]
    : defaultOrigins
  ).map((origin) => origin.trim())
);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origins.has(origin)) return callback(null, true);
    if (
      allowVercelPreviewOrigins &&
      /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: false,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({ ok: true, service: "ETMS API" });
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use("/auth", authRoutes);
app.use("/categories", categoryRoutes);
app.use("/employees", employeeRoutes);
app.use("/exports", exportRoutes);
app.use("/uploads", uploadRoutes);
app.use("/api/vacancies", vacancyRoutes);
app.use("/vacancies", vacancyRoutes);
app.use("/reports", reportRoutes);

app.use((_req, _res, next) => {
  next(new AppError("Not found", 404));
});

app.use(errorHandler);

module.exports = app;
