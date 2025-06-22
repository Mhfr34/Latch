const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const router = require("./routes");

// WhatsApp dependencies
const { Client, RemoteAuth } = require("whatsapp-web.js");
const { MongoStore } = require("wwebjs-mongo");
const qrcode = require("qrcode-terminal");
const driverModel = require("./models/driverModel");

const app = express();

// Store QR globally for API access
global.lastQr = null;

// Middleware to parse JSON requests
app.use(express.json({ limit: "50mb" }));

// Custom CORS middleware
app.use((req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : [];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS, PATCH, DELETE, POST, PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Auth-Token, X-User-Agent, X-Request-Id, X-Forwarded-For, X-Forwarded-Host, X-Forwarded-Proto, X-Forwarded-Port, X-Forwarded-Uri, X-Forwarded-Protocol"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// Main API router under "/api"
app.use("/api", router);

const PORT = process.env.PORT || 8080;

const startServerAndWhatsApp = async () => {
  // Connect to database
  await connectDB();

  // Start Express server
  app.listen(PORT, () => {
    console.log("Connected to DB");
    console.log(`Server is running on port ${PORT}`);
  });

  // Set up WhatsApp MongoStore for session persistence with mongoose instance
  const store = new MongoStore({ mongoose: mongoose });

  // WhatsApp client configuration with RemoteAuth
  const client = new Client({
    authStrategy: new RemoteAuth({
      store: store,
      backupSyncIntervalMs: 300000, // sync every 5 min
    }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  // QR code generation
  client.on("qr", (qr) => {
    global.lastQr = qr;
    qrcode.generate(qr, { small: true });
  });

  // Function to check and send subscription reminders
  const checkAndSendReminders = async () => {
    try {
      console.log("Checking for upcoming subscriptions...");
      const allDrivers = await driverModel.find({}).sort({ createdAt: -1 });

      if (!allDrivers || allDrivers.length === 0) {
        console.log("No drivers found in database");
        return;
      }

      const BATCH_SIZE = 5; // Number of parallel messages
      const DELAY_MS = 1000; // Delay between batches
      const currentTime = new Date();

      for (let i = 0; i < allDrivers.length; i += BATCH_SIZE) {
        const batch = allDrivers.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (driver) => {
            try {
              if (
                driver.subscriptionStatus &&
                driver.subscriptionStatus.toLowerCase() === "active" &&
                driver.nextSubscriptionDate
              ) {
                const nextSubscriptionDate = new Date(
                  driver.nextSubscriptionDate
                );
                const twoAndHalfHoursFromNow = new Date(
                  currentTime.getTime() + 2.5 * 60 * 60 * 1000
                );

                if (
                  nextSubscriptionDate <= twoAndHalfHoursFromNow &&
                  nextSubscriptionDate > currentTime
                ) {
                  const phone = driver.phoneNumber.toString().replace(/^0/, "");
                  const chatId = `961${phone}@c.us`;
                  const message = `Dear ${driver.name}, please don't forget to pay your subscription fee. Thank you!`;

                  const response = await client.sendMessage(chatId, message);
                  console.log(
                    `Message sent to ${driver.name} (${chatId}):`,
                    response.id.id
                  );

                  // Update nextSubscriptionDate to the next month
                  const updatedNextSubscription = new Date(
                    nextSubscriptionDate
                  );
                  updatedNextSubscription.setMonth(
                    updatedNextSubscription.getMonth() + 1
                  );
                  await driverModel.updateOne(
                    { _id: driver._id },
                    { $set: { nextSubscriptionDate: updatedNextSubscription } }
                  );
                  console.log(
                    `Updated nextSubscriptionDate for ${driver.name} to ${updatedNextSubscription}`
                  );
                } else {
                  console.log(
                    `Skipped ${driver.name}: Subscription date not within 2.5 hours (${nextSubscriptionDate})`
                  );
                }
              } else {
                console.log(
                  `Skipped ${driver.name}: Subscription not active or no next subscription date (${driver.subscriptionStatus})`
                );
              }
            } catch (err) {
              console.error(`Error sending to ${driver.name}:`, err);
            }
          })
        );

        if (i + BATCH_SIZE < allDrivers.length) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      }
    } catch (error) {
      console.error("Database error:", error);
    }
  };

  client.on("ready", async () => {
    console.log("WhatsApp client is ready!");
    await checkAndSendReminders();

    // Set up continuous checking every hour
    const CHECK_INTERVAL = 60 * 60 * 1000;
    setInterval(checkAndSendReminders, CHECK_INTERVAL);
    console.log(`Started continuous checking every hour`);
  });

  client.on("disconnected", (reason) => {
    console.log("WhatsApp client was logged out:", reason);
  });

  client.on("auth_failure", (msg) => {
    console.error("WhatsApp authentication failure:", msg);
  });

  client.initialize();

  process.on("SIGINT", () => {
    console.log("Shutting down...");
    client.destroy();
    process.exit();
  });
};

startServerAndWhatsApp();
