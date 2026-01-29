const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const exportRoutes = require("./routes/exportRoutes");
const errorHandler = require("./middlewares/errorHandler");
const { AppError } = require("./utils/errors");

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/employees", employeeRoutes);
app.use("/exports", exportRoutes);

app.use((_req, _res, next) => {
  next(new AppError("Not found", 404));
});

app.use(errorHandler);

module.exports = app;
