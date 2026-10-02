const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 10000;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// =========================
// MIDDLEWARE
// =========================
app.use(cors());
app.use(express.json());

// =========================
// ROOT ROUTE
// =========================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SanibossXM backend is running",
    service: "Paystack Payment API",
    version: "1.0.1"
  });
});

// =========================
// HEALTH CHECK
// =========================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is healthy",
    service: "SanibossXM backend",
    timestamp: new Date().toISOString()
  });
});

// =========================
// TEST API ROUTE
// =========================
app.get("/api/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SanibossXM API test successful"
  });
});

// =========================
// INITIALIZE PAYSTACK PAYMENT
// =========================
app.post("/api/payment/initialize", async (req, res) => {
  try {
    const {
      email,
      amount,
      reference,
      callback_url
    } = req.body;

    if (!email || !amount) {
      return res.status(400).json({
        success: false,
        message: "Email and amount are required"
      });
    }

    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "Paystack secret key is not configured on the server"
      });
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount < 100) {
      return res.status(400).json({
        success: false,
        message: "Amount must be at least ₦100"
      });
    }

    const paymentData = {
      email: email,
      amount: Math.round(numericAmount * 100)
    };

    if (reference) {
      paymentData.reference = reference;
    }

    if (callback_url) {
      paymentData.callback_url = callback_url;
    }

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      paymentData,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.status(200).json({
      success: true,
      message: "Payment initialized successfully",
      data: response.data.data
    });

  } catch (error) {
    console.error(
      "Payment initialization error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: "Unable to initialize payment",
      error:
        error.response?.data?.message ||
        error.message
    });
  }
});

// =========================
// VERIFY PAYSTACK PAYMENT
// =========================
app.get("/api/payment/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: "Payment reference is required"
      });
    }

    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "Paystack secret key is not configured on the server"
      });
    }

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const payment = response.data.data;

    return res.status(200).json({
      success: true,
      status: payment.status,
      reference: payment.reference,
      amount: payment.amount,
      currency: payment.currency,
      email: payment.customer?.email || null,
      paid_at: payment.paid_at || null
    });

  } catch (error) {
    console.error(
      "Payment verification error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: "Unable to verify payment",
      error:
        error.response?.data?.message ||
        error.message
    });
  }
});

// =========================
// 404 HANDLER
// =========================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl
  });
});

// =========================
// START SERVER
// =========================
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `SanibossXM backend running on port ${PORT}`
  );
});
