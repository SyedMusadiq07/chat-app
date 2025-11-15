const User = require("../models/User.js");
const otpGenerate = require("../utils/otpGenerator");
const response = require("../utils/responseHandler");
const { sendOtpToEmail } = require("../services/emailService.js");
const {
  sendOtpToPhoneNumber,
  verifyOtpTwilio,
} = require("../services/twilioService.js");
const generateToken = require("../utils/generateToken.js");

//step1: send otp
const sendOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, email } = req.body;
  const otp = otpGenerate();
  const expiry = new Date(Date.now() + 5 * 60 * 1000);
  let user;

  try {
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        user = new User({ email });
      }
      user.emailOtp = otp;
      user.emailOtpExpiry = expiry;
      await user.save();
      await sendOtpToEmail(email, otp);
      return response(res, 200, "OTP sent to your email", { email });
    }

    if (!phoneNumber || !phoneSuffix) {
      return response(res, 400, "Phone number and suffix are required");
    }

    const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
    user = await User.findOne({ phoneNumber });
    if (!user) {
      user = new User({ phoneNumber, phoneSuffix });
    }

    try {
      await sendOtpToPhoneNumber(fullPhoneNumber);
      await user.save();
      return response(res, 200, "OTP sent to your phone", user);
    } catch (twilioError) {
      if (twilioError.code === 21608) {
        return response(res, 403, "Phone number must be verified in Twilio console for trial accounts");
      }
      throw twilioError;
    }
  } catch (error) {
    console.error("Error in sendOtp:", error);
    return response(res, 500, "Internal Server Error");
  }
};

//step2: verify otp
const verifyOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, email, otp } = req.body;

  try {
    let user;
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        return response(res, 404, "User not found");
      }

      const now = new Date();
      if (
        !user.emailOtp ||
        (String(user.emailOtp) !== String(otp) &&
          new Date(user.emailOtpExpiry) < now)
      ) {
        return response(res, 400, "Invalid or expired OTP");
      }

      user.isVerified = true;
      user.emailOtp = null;
      user.emailOtpExpiry = null;
      await user.save();
    } else {
      if (!phoneNumber || !phoneSuffix) {
        return response(res, 400, "Phone number and suffix are required");
      }

      const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
      user = await User.findOne({ phoneNumber });
      if (!user) {
        return response(res, 404, "User not found");
      }
      const verificationResponse = await verifyOtpTwilio(fullPhoneNumber, otp);
      if (verificationResponse.status !== "approved") {
        return response(res, 400, "Invalid OTP");
      }
      user.isVerified = true;
      await user.save();
    }

    const token = generateToken(user?._id);
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    return response(res, 200, "OTP verified successfully", { user, token });
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    return response(res, 500, "Internal Server Error");
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
};