const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  secret: { type: String, required: true },
  email: { type: String, required: true },
  expirationTime: {
    type: Date,
    default: function () {
      return new Date(Date.now() + 3 * 60 * 1000);
    },
    require: true,
  },
});

otpSchema.index({ expirationTime: 1 }, { expireAfterSeconds: 0 });

const OTPModel = mongoose.model("OTP", otpSchema);

module.exports = OTPModel;
