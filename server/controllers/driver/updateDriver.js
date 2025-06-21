const driverModel = require("../../models/driverModel");

async function updateDriver(req, res) {
  try {
    const { _id, ...resBody } = req.body;

    const updateDriver = await driverModel.findByIdAndUpdate(_id, resBody);

    res.json({
      message: "Driver updated successfully",
      success: true,
      data: updateDriver,
      error: false,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
}
module.exports = updateDriver;
