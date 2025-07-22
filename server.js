import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import dotenv from "dotenv"
import { createServer } from "http"
import { WebSocketServer } from "ws"
import twilioRoutes from "./routes/twilio.js"
import callService from "./services/callService.js"

dotenv.config()

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server })

// Middleware
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// Routes
app.use("/twilio", twilioRoutes)

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() })
})

// Start a call endpoint
app.post("/start-call", async (req, res) => {
  try {
    const { phoneNumber, message } = req.body

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" })
    }

    const call = await callService.initiateCall(phoneNumber, message)
    res.json({
      success: true,
      callSid: call.sid,
      message: "Call initiated successfully",
    })
  } catch (error) {
    console.error("Error starting call:", error)
    res.status(500).json({ error: "Failed to start call" })
  }
})

// WebSocket connection for real-time call updates
wss.on("connection", (ws) => {
  console.log("WebSocket client connected")

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message)
      console.log("Received WebSocket message:", data)
    } catch (error) {
      console.error("Invalid WebSocket message:", error)
    }
  })

  ws.on("close", () => {
    console.log("WebSocket client disconnected")
  })
})

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
  console.log(`🚀 AI Call App running on port ${PORT}`)
  console.log(`📞 Twilio webhooks: http://localhost:${PORT}/twilio`)
  console.log(`🔗 WebSocket server running on ws://localhost:${PORT}`)
})

export { wss }
