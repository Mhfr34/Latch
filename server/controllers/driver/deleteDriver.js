const driverModel = require("../../models/driverModel");

async function deleteDriver(req, res) {
  try {
    const { driverId } = req.body;

    // Validate driverId
    if (!driverId) {
      return res.status(400).json({
        error: true,
        success: false,
        message: "Driver ID is required.",
      });
    }

    // Find and delete the driver
    const deletedDriver = await driverModel.findByIdAndDelete(driverId);

    // Check if the driver was found and deleted
    if (!deletedDriver) {
      return res
        .status(404)
        .json({ error: true, success: false, message: "Driver not found." });
    }

    return res.status(200).json({
      message: "Driver deleted successfully",
      success: true,
      data: deletedDriver,
      error: false,
    });
  } catch (error) {
    console.error("Error deleting driver:", error);
    return res.status(500).json({
      error: true,
      message: err?.message || "Server Error",
      success: false,
    });
  }
}
module.exports = deleteDriver;
// This code defines a function to delete a driver from the database.
