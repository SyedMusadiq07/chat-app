const User = require("../models/User.js");
const otpGenerate = require("../utils/otpGenerator");
const response = require("../utils/responseHandler");
const { sendOtpToEmail } = require("../services/emailService.js");
const {
  sendOtpToPhoneNumber,
  verifyOtpTwilio,
} = require("../services/twilioService.js");
const generateToken = require("../utils/generateToken.js");
const { uploadFileToCloudinary } = require("../config/cloudinaryConfig.js");
const Conversation = require("../models/Conversation.js");

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
        return response(
          res,
          403,
          "Phone number must be verified in Twilio console for trial accounts"
        );
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

const updateProfile = async (req, res) => {
  const { username, agreed, about } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return response(res, 404, "User not found");
    }
    const file = req.file;

    if (file) {
      const uploadResult = await uploadFileToCloudinary(file);
      console.log("Upload Result:", uploadResult);
      user.profilePicture = uploadResult?.secure_url;
    } else if (req.body.profilePicture) {
      user.profilePicture = req.body.profilePicture;
    }

    if (username) user.username = username;
    if (about) user.about = about;
    if (agreed !== undefined) user.agreed = agreed;
    await user.save();

    return response(res, 200, "Profile updated successfully", user);
  } catch (error) {
    console.error("Error in updateProfile:", error);
    return response(res, 500, "Internal Server Error");
  }
};

const logout = (req, res) => {
  try {
    res.clearCookie("auth_token", {
      expires: new Date(0),
      httpOnly: true,
    });
    return response(res, 200, "Logged out successfully");
  } catch (error) {
    console.error("Error in logout:", error);
    return response(res, 500, "Internal Server Error");
  }
};

const checkAuthenticated = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return response(
        res,
        401,
        "Unauthorized : login before accessing our application"
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return response(res, 404, "User not found");
    }
    return response(res, 200, "User is authenticated", { user });
  } catch (error) {
    console.error("Error in checkAuthenticated:", error);
    return response(res, 500, "Internal Server Error");
  }
};

// make this except logged in user ?
const getAllUsers = async (req, res) => {
  const userId = req.user.id;
  try {
    const users = await User.find({ _id: { $ne: userId } })
      .select(
        "username  profilePicture   lastSeen isOnline about  phoneNumber phoneSuffix"
      )
      .lean();

    //find there last conversation
    const userWithConversation = await Promise.all(
      users.map(async (user) => {
        const conversation = await Conversation.findOne({
          participants: { $all: [userId, user._id] },
        }).populate({
          path: "lastMessage",
          select: "content createdAt sender receiver",
        }).lean();
        return {
          ...user,
          conversation: conversation || null,
        };
      })
    );

    return response(res, 200, "Users fetched successfully", userWithConversation);
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    return response(res, 500, "Internal Server Error");
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  updateProfile,
  logout,
  checkAuthenticated,
  getAllUsers,
};
