const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const exportRoutes = require("./routes/exportRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const vacancyRoutes = require("./routes/vacancyRoutes");
const reportRoutes = require("./routes/reportRoutes");
const transfersRoutes = require("./routes/transfersRoutes");
const errorHandler = require("./middlewares/errorHandler");
const { AppError } = require("./utils/errors");
const app = express();
app.set("etag", false);
app.set("trust proxy", true);

const normalizeOrigin = (origin) => String(origin || "").trim().replace(/\/+$/, "");
const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",
  "https://www.hfwgeneralpost.com",
  "https://hfwgeneralpost.com",
  "https://employee-transfer-frontend.vercel.app",
].map(normalizeOrigin);
const configuredOrigins = [
  process.env.CORS_ORIGIN || "",
  process.env.VERCEL_FRONTEND_URL || "",
  process.env.CUSTOM_FRONTEND_URL || "",
]
  .join(",")
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);
const allowVercelPreviewOrigins =
  String(process.env.ALLOW_VERCEL_PREVIEW_ORIGINS || "true").toLowerCase() ===
  "true";
const isLocalhostOrigin = (origin) => {
  try {
    const { hostname, protocol } = new URL(origin);
    return (
      ["http:", "https:"].includes(protocol) &&
      ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname)
    );
  } catch (_error) {
    return false;
  }
};
const isAllowedOrigin = (origin) =>
  origins.has(origin) ||
  isLocalhostOrigin(origin) ||
  (allowVercelPreviewOrigins &&
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin));
const origins = new Set(
  (configuredOrigins.length > 0
    ? [...defaultOrigins, ...configuredOrigins]
    : defaultOrigins
  ).map(normalizeOrigin)
);
const corsMethods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"];
const corsAllowedHeaders = ["Authorization", "Content-Type"];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalizedOrigin = normalizeOrigin(origin);
    if (isAllowedOrigin(normalizedOrigin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: corsMethods,
  allowedHeaders: corsAllowedHeaders,
  preflightContinue: false,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
// Express 5/path-to-regexp does not accept app.options("*", ...).
// A regex route provides the same global preflight coverage without parsing errors.
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
app.use("/employees", employeeRoutes);
app.use("/exports", exportRoutes);
app.use("/uploads", uploadRoutes);
app.use("/api/vacancies", vacancyRoutes);
app.use("/vacancies", vacancyRoutes);
app.use("/reports", reportRoutes);
app.use("/transfers", transfersRoutes);

app.use((_req, _res, next) => {
  next(new AppError("Not found", 404));
});

app.use(errorHandler);

module.exports = app;
