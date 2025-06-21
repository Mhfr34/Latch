const driverModel = require("../../models/driverModel");

async function getDrivers(req, res) {
  try {
    const allDrivers = await driverModel.find({}).sort({ createdAt: -1 });
    res.json({
      data: allDrivers,
      success: true,
      error: false,
      message: "All Drivers List",
    });
  } catch (error) {
    res.status(400).json({
      error: true,
      success: false,
      message: error.message || error,
    });
  }
}
module.exports = getDrivers;
// This code defines a function to retrieve all drivers from the database and return them in the response.
