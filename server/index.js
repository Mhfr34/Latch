const express = require("express");
require("dotenv").config();
const connectDB = require("./config/db");
const router = require("./routes");
const driverModel = require("./models/driverModel");
const wppconnect = require("@wppconnect-team/wppconnect");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

// Basic configuration
const PORT = process.env.PORT || 8080;

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "X-CSRF-Token",
    "X-Requested-With",
    "Accept",
    "Accept-Version",
    "Content-Length",
    "Content-MD5",
    "Content-Type",
    "Date",
    "X-Api-Version",
    "Authorization",
    "X-Auth-Token",
    "X-User-Agent",
    "X-Request-Id",
    "X-Forwarded-For",
    "X-Forwarded-Host",
    "X-Forwarded-Proto",
    "X-Forwarded-Port",
    "X-Forwarded-Uri",
    "X-Forwarded-Protocol",
  ],
};

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(cors(corsOptions));

// Route handling
app.use("/api", router);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Database connection and server start
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log("Connected to DB");
    });
  })
  .catch((error) => {
    console.error("Database connection failed", error);
    process.exit(1);
  });
