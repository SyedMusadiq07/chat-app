const twilio = require("twilio");

// Load environment variables
const accontSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;

const client = twilio(accontSid, authToken);

// Function to send OTP
const sendOtpToPhoneNumber = async (phoneNumber) => {
  try {
    console.log("Sending OTP to:", phoneNumber);
    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    const response = await client.verify
      .services(serviceSid)
      .verifications.create({ to: phoneNumber, channel: "sms" });

    console.log("OTP sent response:", response);
    return response;
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw new Error("Failed to send OTP");
  }
};


const verifyOtp = async (phoneNumber, otp) => {
  try {
    console.log("this is phone number and otp", phoneNumber, otp);
    if (!phoneNumber || !otp) {
      throw new Error("Phone number and OTP are required");
    }
    const response = await client.verify
      .services(serviceSid)
      .verificationChecks.create({ to: phoneNumber, code: otp });

    console.log("OTP verification response:", response);
    return response;
  } catch (error) {
    console.error("Error verifying OTP:", error);
    throw new Error("Failed to verify OTP");
  }
};

module.exports = {
  sendOtpToPhoneNumber,
  verifyOtp,
};