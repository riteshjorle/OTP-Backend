const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// OTP store
const otpStore = new Map();

// Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Test route
app.get("/", (req, res) => {
  res.send("OTP Backend is running!");
});

// ================= SEND OTP =================

app.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // OTP expires after 1 minute
    const expiresAt = Date.now() + 60 * 1000;

    // Save OTP
    otpStore.set(email, {
      otp: otp,
      expiresAt: expiresAt,
    });

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Portfolio Verification OTP",
      text: `Your verification OTP is ${otp}. This OTP will expire in 1 minute.`,
    });

    res.json({
      success: true,
      message: "OTP sent successfully",
    });

  } catch (error) {
    console.error("Send OTP Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
});

// ================= VERIFY OTP =================

app.post("/verify-otp", (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const savedData = otpStore.get(email);

    // OTP doesn't exist
    if (!savedData) {
      return res.status(400).json({
        success: false,
        message: "OTP not found. Please request a new OTP.",
      });
    }

    // OTP expired
    if (Date.now() > savedData.expiresAt) {
      otpStore.delete(email);

      return res.status(410).json({
        success: false,
        message: "OTP expired. Please resend OTP.",
      });
    }

    // Wrong OTP
    if (otp !== savedData.otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

    // Correct OTP
    otpStore.delete(email);

    res.json({
      success: true,
      message: "OTP verified successfully",
    });

  } catch (error) {
    console.error("Verify OTP Error:", error);

    res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
});

// ================= START SERVER =================

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});