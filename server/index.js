const express = require("express");
require("dotenv").config();
const connectDB = require("./config/db");
const router = require("./routes");
const driverModel = require("./models/driverModel");
const wppconnect = require("@wppconnect-team/wppconnect");
const fs = require("fs");
const path = require("path");

const app = express();

// Middleware to parse JSON requests
app.use(express.json({ limit: "50mb" }));

// CORS middleware function
const allowCors = (fn) => async (req, res) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS.split(",");

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*"); // Wildcard for testing
  }

  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS, PATCH, DELETE, POST, PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Auth-Token, X-User-Agent, X-Request-Id, X-Forwarded-For, X-Forwarded-Host, X-Forwarded-Proto, X-Forwarded-Port, X-Forwarded-Uri, X-Forwarded-Protocol"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  return await fn(req, res);
};

// Apply CORS middleware to all routes under /api
app.use("/api", allowCors(router));

// Connect to database
const PORT = process.env.PORT || 8080;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log("Connected to DB");
    console.log(`Server is running on port ${PORT}`);
  });
});
