const express = require("express");
require("dotenv").config();
const connectDB = require("./config/db");
const router = require("./routes");
const driverModel = require("./models/driverModel");
const wppconnect = require("@wppconnect-team/wppconnect");

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

// Use your main API router under "/api"
app.use("/api", router);

const PORT = process.env.PORT || 8080;

// Store the latest QR code as data URL (in-memory, for demo purposes)
let latestQrImageDataUrl = null;
let latestQrTimestamp = null;

// Endpoint to serve the QR code for WhatsApp linking
app.get("/api/whatsapp-qr", (req, res) => {
  if (latestQrImageDataUrl) {
    res.json({
      qrImageUrl: latestQrImageDataUrl,
      timestamp: latestQrTimestamp,
    });
  } else {
    res.status(404).json({ qrImageUrl: null, message: "QR not available" });
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

  // WhatsApp client configuration using @wppconnect-team/wppconnect
  const client = await wppconnect.create({
    session: "your-session-name", // change as needed
    catchQR: (qrCode, asciiQR, attempts, urlCode) => {
      // urlCode is a base64 image or data URL
      latestQrImageDataUrl = urlCode.startsWith("data:image")
        ? urlCode
        : `data:image/png;base64,${urlCode}`;
      latestQrTimestamp = Date.now();
      console.log("Generated QR code for WhatsApp login");
    },
    headless: true,
    devtools: false,
    useChrome: false,
    browserArgs: ["--no-sandbox"],
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

      const BATCH_SIZE = 5;
      const DELAY_MS = 1000;
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

                // Check if the next subscription date is within the next 2.5 hours
                if (
                  nextSubscriptionDate <= twoAndHalfHoursFromNow &&
                  nextSubscriptionDate > currentTime
                ) {
                  const phone = driver.phoneNumber.toString().replace(/^0/, "");
                  const chatId = `961${phone}@c.us`;
                  const message = `Dear ${driver.name}, please don't forget to pay your subscription fee. Thank you!`;

                  await client.sendText(chatId, message);
                  console.log(`Message sent to ${driver.name} (${chatId})`);

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

  // Use state change event to detect when the client is connected
  client.onStateChange(async (state) => {
    console.log(`Client state changed: ${state}`);
    if (state === "CONNECTED") {
      await checkAndSendReminders();
      // Set up continuous checking every hour
      const CHECK_INTERVAL = 60 * 60 * 1000;
      setInterval(checkAndSendReminders, CHECK_INTERVAL);
      console.log(`Started continuous checking every hour`);
    }
    if (state === "CONFLICT" || state === "UNLAUNCHED") client.useHere();
  });

  client.onStreamChange((state) => {
    if (state === "DISCONNECTED" || state === "SYNCING") {
      console.log("Stream state:", state);
    }
  });

  client.onLogout(() => {
    console.log("WhatsApp client was logged out");
  });

  client.on("auth_failure", (msg) => {
    console.error("WhatsApp authentication failure:", msg);
  });

  process.on("SIGINT", async () => {
    console.log("Shutting down...");
    await client.close();
    process.exit();
  });
};

startServerAndWhatsApp();
