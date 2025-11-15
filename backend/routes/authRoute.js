const express = require("express");
const { sendOtp, verifyOtp } = require("../controllers/authController.js");

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

module.exports = router;
