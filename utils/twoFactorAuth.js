const speakeasy = require("speakeasy");
const logger = require("../utils/logger");

const generateOTP = () => {
  const secret = speakeasy.generateSecret({ length: 20 });
  const otp = speakeasy.totp({
    secret: secret.base32,
    encoding: "base32",
  });
  logger.debug("secret:" + secret.base32);
  logger.debug("otp:" + otp);

  return { otp, secret: secret.base32 };
};

const verifyOTP = (sec, otp) => {
  const validateOTP = speakeasy.totp.verifyDelta({
    secret: sec,
    encoding: "base32",
    token: otp,
    window: 2,
  });
  logger.debug("secret:" + sec);
  logger.debug("otp:" + otp);
  logger.debug(validateOTP);
  return validateOTP;
};

module.exports = { generateOTP, verifyOTP };
