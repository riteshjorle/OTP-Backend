const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log("REQUEST:", req.method, req.url);
  next();
});

const otpStore = new Map();

const resend = new Resend(process.env.RESEND_API_KEY);

// ================= HOME =================

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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = Date.now() + 60 * 1000;

    otpStore.set(email, {
      otp,
      expiresAt,
    });

    console.log("OTP generated for:", email);

    const { data, error } = await resend.emails.send({
      from: "Portfolio <onboarding@resend.dev>",
      to: [email],
      subject: "Your Portfolio Verification OTP",
      text: `Your verification OTP is ${otp}. This OTP will expire in 1 minute.`,
    });

    if (error) {
      console.error("Resend Error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to send OTP",
      });
    }

    console.log("OTP email sent successfully:", data);

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

    if (!savedData) {
      return res.status(400).json({
        success: false,
        message: "OTP not found. Please request a new OTP.",
      });
    }

    if (Date.now() > savedData.expiresAt) {
      otpStore.delete(email);

      return res.status(410).json({
        success: false,
        message: "OTP expired. Please resend OTP.",
      });
    }

    if (otp !== savedData.otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

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