const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const exportRoutes = require("./routes/exportRoutes");
const errorHandler = require("./middlewares/errorHandler");
const { AppError } = require("./utils/errors");
const app = express();

const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
const corsOptions = {
  origin: corsOrigin,
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
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
