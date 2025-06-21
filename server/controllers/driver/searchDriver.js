const driverModel = require("../../models/driverModel");

// Helper to escape regex special chars
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const searchDriver = async (req, res) => {
  try {
    const query = req.query.q || "";
    const safeQuery = escapeRegex(query);
    const regex = new RegExp(safeQuery, "ig"); // Case-insensitive, global

    const drivers = await driverModel.find({
      $or: [{ name: regex }, { phoneNumber: regex }],
    });

    res.json({
      data: drivers,
      success: true,
      error: false,
      message: "Search Drivers List",
    });
  } catch (error) {
    res.json({
      error: true,
      success: false,
      message: error.message || error,
    });
  }
};

module.exports = searchDriver;
