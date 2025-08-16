import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import callService from "./services/callService.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Import and use Twilio routes
import twilioRoutes from "./routes/twilio.js";
app.use("/twilio", twilioRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Root endpoint for Twilio fallback webhook
app.post("/", (req, res) => {
  res.redirect("/twilio/voice");
});

// Test STT endpoint - for testing transcription
app.post("/test-stt", (req, res) => {
  res.json({
    message: "STT service is ready",
    status: "OK"
  });
});

// Start outbound call endpoint
app.post("/start-call", async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }
    const call = await callService.initiateCall(phoneNumber, message);
    res.json({
      success: true,
      callSid: call.sid,
      message: "Call initiated successfully",
      phoneNumber: phoneNumber
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to start call",
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
