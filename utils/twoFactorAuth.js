const speakeasy = require("speakeasy");

const generateOTP = () => {
  const secret = speakeasy.generateSecret({ length: 20 });
  const otp = speakeasy.totp({
    secret: secret.base32,
    encoding: "base32",
  });
  return { otp, secret: secret.base32 };
};

const verifyOTP = (sec, otp) => {
  const validateOTP = speakeasy.totp.verify({
    secret: sec,
    encoding: "base32",
    token: otp,
    window: 3,
  });
  return validateOTP;
};

module.exports = { generateOTP, verifyOTP };
