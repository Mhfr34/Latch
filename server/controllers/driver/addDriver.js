const driverModel = require("../../models/driverModel");

async function addDriver(req, res) {
  try {
    const { name, phoneNumber, subscriptionStatus, nextSubscriptionDate } =
      req.body;

    // Validate required fields
    if (!name || !phoneNumber) {
      return res
        .status(400)
        .json({ error: "Name and phone number are required." });
    }

    // Create new driver instance
    const newDriver = new driverModel({
      name,
      phoneNumber,
      subscriptionStatus: subscriptionStatus || "inactive",
      nextSubscriptionDate: nextSubscriptionDate || null,
    });

    // Save the driver to the database
    const saveDriver = await newDriver.save();

    return res.status(201).json({
      message: "Driver added successfully",
      driver: newDriver,
      success: true,
      data: saveDriver,
    });
  } catch (error) {
    console.error("Error adding driver:", error);
    return res
      .status(500)
      .json({ error: true, message: error.message || error, success: false });
  }
}
module.exports = addDriver;
