const express = require("express");
const router = express.Router();
const AddProductController = require("../controllers/driver/addDriver");
const UpdateDriverController = require("../controllers/driver/updateDriver");
const DeleteDriverController = require("../controllers/driver/deleteDriver");
const GetAllDriversController = require("../controllers/driver/getDrivers");
const SearchDriverController = require("../controllers/driver/searchDriver");

// Driver routes
router.post("/add-driver", AddProductController);
router.post("/update-driver", UpdateDriverController);
router.delete("/delete-driver", DeleteDriverController);
router.get("/get-all-drivers", GetAllDriversController);
router.get("/search-driver", SearchDriverController);

// WhatsApp QR code endpoint
router.get("/whatsapp-qr", (req, res) => {
  if (global.lastQr) {
    res.json({ qr: global.lastQr });
  } else {
    res.status(404).json({ error: "No QR code available" });
  }
});

module.exports = router;
