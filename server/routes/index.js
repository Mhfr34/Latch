const express = require("express");
const router = express.Router();
const AddProductController = require("../controllers/driver/addDriver");
const UpdateDriverController = require("../controllers/driver/updateDriver");
const DeleteDriverController = require("../controllers/driver/deleteDriver");
const GetAllDriversController = require("../controllers/driver/getDrivers");
const SearchDriverController = require("../controllers/driver/searchDriver");

//Driver
router.post("/add-driver", AddProductController);
router.post("/update-driver", UpdateDriverController);
router.delete("/delete-driver", DeleteDriverController);
router.get("/get-all-drivers", GetAllDriversController);
router.get("/search-driver", SearchDriverController);

module.exports = router;
// This code sets up the routes for managing drivers in an Express application.
