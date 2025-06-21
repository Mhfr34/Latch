const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      unique: true,
      required: true,
      match: [/^\d+$/, "Phone number must contain only digits"],
    },

    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
    },
    nextSubscriptionDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);
const Driver = mongoose.model("Driver", UserSchema);

module.exports = Driver;
