const path = require("path");
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const exportRoutes = require("./routes/exportRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const errorHandler = require("./middlewares/errorHandler");
const { AppError } = require("./utils/errors");
const app = express();

const defaultOrigins = ["http://localhost:5173", "http://localhost:8080"];
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const origins = allowedOrigins.length > 0 ? allowedOrigins : defaultOrigins;

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: false,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/categories", categoryRoutes);
app.use("/employees", employeeRoutes);
app.use("/exports", exportRoutes);
app.use("/uploads", uploadRoutes);

app.use((_req, _res, next) => {
  next(new AppError("Not found", 404));
});

app.use((err, req, res, next) => {
  console.error("UNHANDLED:", err);
  next(err);
});

app.use(errorHandler);

module.exports = app;
