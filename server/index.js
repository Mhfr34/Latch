const express = require("express");
require("dotenv").config();
const connectDB = require("./config/db");
const mongoose = require("mongoose");
const router = require("./routes");

// WhatsApp dependencies
const { Client, RemoteAuth } = require("whatsapp-web.js");
const { MongoStore } = require("wwebjs-mongo");
const QRCode = require("qrcode");
const driverModel = require("./models/driverModel");

const app = express();

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

app.use("/api", router);

// Root and favicon endpoints to avoid 404s in logs
app.get("/", (req, res) => {
  res.send("API Server is running.");
});
app.get("/favicon.ico", (req, res) => res.status(204).end());

const PORT = process.env.PORT || 8080;

// Store the latest QR string for frontend
let latestQrString = null;

// --- Always register the QR endpoint, even before WhatsApp client is initialized ---
app.get("/api/whatsapp-qr", async (req, res) => {
  if (!latestQrString) {
    return res
      .status(200)
      .json({ qrImageUrl: null, error: "QR code not generated yet" });
  }
  try {
    const qrImageUrl = await QRCode.toDataURL(latestQrString);
    res.json({ qrImageUrl });
  } catch (e) {
    res.status(500).json({ error: "Failed to generate QR image" });
  }
});

const startServerAndWhatsApp = async () => {
  // Connect to database
  await connectDB();

  // Start Express server
  app.listen(PORT, () => {
    console.log("Connected to DB");
    console.log(`Server is running on port ${PORT}`);
  });

  // Pass mongoose instance to MongoStore
  const store = new MongoStore({ mongoose });

  // WhatsApp client configuration with RemoteAuth
  // Store data in a directory that is always writable (such as process.cwd())
  const sessionDir = process.env.WWEBJS_AUTH_DIR || "./.wwebjs_auth";
  const fs = require("fs");
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const client = new Client({
    authStrategy: new RemoteAuth({
      store: store,
      backupSyncIntervalMs: 300000, // sync every 5 min
      clientId: "default", // optional, can change if you want multiple sessions
      dataPath: sessionDir,
    }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  // Store QR when generated for serving to frontend
  client.on("qr", (qr) => {
    latestQrString = qr;
    console.log("New WhatsApp QR generated.");
  });

  // Function to check and send subscription reminders
  const checkAndSendReminders = async () => {
    try {
      console.log("Checking for upcoming subscriptions...");

      // Retrieve all drivers from database
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

        // Process batch in parallel
        await Promise.all(
          batch.map(async (driver) => {
            try {
              // Check subscription status and next subscription date before sending
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

                // Check if the next subscription date is within the next 2.5 hours
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
                  // If original was on 31st and next month has less days, setDate auto-adjusts
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

        // Wait before next batch
        if (i + BATCH_SIZE < allDrivers.length) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      }
    } catch (error) {
      console.error("Database error:", error);
    }
  };

  // Client ready event
  client.on("ready", async () => {
    console.log("WhatsApp client is ready!");

    // Initial check
    await checkAndSendReminders();

    // Set up continuous checking every hour (adjust as needed)
    const CHECK_INTERVAL = 60 * 60 * 1000; // every hour
    setInterval(checkAndSendReminders, CHECK_INTERVAL);
    console.log(`Started continuous checking every hour`);
  });

  // Error handling
  client.on("disconnected", (reason) => {
    console.log("WhatsApp client was logged out:", reason);
  });

  // Authentication failure
  client.on("auth_failure", (msg) => {
    console.error("WhatsApp authentication failure:", msg);
  });

  // Initialize WhatsApp client
  client.initialize();

  // Handle process termination
  process.on("SIGINT", () => {
    console.log("Shutting down...");
    client.destroy();
    process.exit();
  });
};

startServerAndWhatsApp();
