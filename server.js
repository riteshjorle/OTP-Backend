const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

// ================= MIDDLEWARE =================

app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log("REQUEST:", req.method, req.url);
  next();
});

// ================= OTP STORE =================

const otpStore = new Map();

// ================= GMAIL TRANSPORTER =================

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Check Gmail SMTP connection
transporter.verify((error, success) => {
  if (error) {
    console.error("Gmail SMTP Error:", error);
  } else {
    console.log("Gmail SMTP connection is ready");
  }
});

// ================= HOME ROUTE =================

app.get("/", (req, res) => {
  res.send("OTP Backend is running!");
});

// ================= SEND OTP =================

app.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    console.log("Send OTP requested for:", email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // OTP expiry: 1 minute
    const expiresAt = Date.now() + 60 * 1000;

    // Save OTP
    otpStore.set(email, {
      otp: otp,
      expiresAt: expiresAt,
    });

    console.log("OTP generated for:", email);

    // Send OTP email
    await transporter.sendMail({
      from: `"Ritesh Portfolio" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Portfolio Verification OTP",
      text: `Your verification OTP is ${otp}. This OTP will expire in 1 minute.`,
    });

    console.log("OTP email sent successfully to:", email);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });

  } catch (error) {
    console.error("Send OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
});

// ================= VERIFY OTP =================

app.post("/verify-otp", (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log("Verify OTP requested for:", email);

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const savedData = otpStore.get(email);

    // OTP not found
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

    console.log("OTP verified successfully for:", email);

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });

  } catch (error) {
    console.error("Verify OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
});

// ================= START SERVER =================

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
