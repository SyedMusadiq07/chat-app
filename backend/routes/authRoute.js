const express = require("express");
const { sendOtp, verifyOtp, updateProfile, logout, checkAuthenticated, getAllUsers } = require("../controllers/authController.js");
const authMiddleware = require("../middleware/authMiiddleware.js");

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.get("/logout", logout);

//protected route

router.put("/update-profile", authMiddleware, updateProfile);
router.get("/check-auth", authMiddleware, checkAuthenticated)
router.get("/users", authMiddleware, getAllUsers);

module.exports = router;
