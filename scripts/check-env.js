#!/usr/bin/env node

require("dotenv").config();

const mode = (process.argv[2] || "runtime").toLowerCase();

const requiredByMode = {
  migrate: ["DATABASE_URL"],
  runtime: ["DATABASE_URL", "JWT_SECRET", "AWS_REGION", "AWS_S3_BUCKET"],
};

if (!requiredByMode[mode]) {
  console.error(
    `Unknown mode "${mode}". Use one of: ${Object.keys(requiredByMode).join(", ")}`
  );
  process.exit(1);
}

const missing = requiredByMode[mode].filter((key) => {
  const value = process.env[key];
  return typeof value !== "string" || value.trim().length === 0;
});

if (missing.length > 0) {
  console.error(`Missing required environment variables for "${mode}" mode:`);
  missing.forEach((key) => console.error(`- ${key}`));
  console.error("\nCopy .env.example to .env and set the missing values.");
  process.exit(1);
}

console.log(`Environment check passed for "${mode}" mode.`);
