const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const exportRoutes = require("./routes/exportRoutes");
const errorHandler = require("./middlewares/errorHandler");
const { AppError } = require("./utils/errors");
const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: false, // JWT header auth (not cookies)
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// hard-guard: never let OPTIONS hit app routes
app.use((req, res, next) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/auth", authRoutes);
app.use("/employees", employeeRoutes);
app.use("/exports", exportRoutes);

app.use((_req, _res, next) => {
  next(new AppError("Not found", 404));
});

app.use((err, req, res, next) => {
  console.error("UNHANDLED:", err);
  next(err);
});

app.use(errorHandler);

module.exports = app;
