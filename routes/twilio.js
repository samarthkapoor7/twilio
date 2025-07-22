import express from "express"
import twilio from "twilio"
import aiService from "../services/aiService.js"
import callStateManager from "../services/callStateManager.js"

const router = express.Router()
const VoiceResponse = twilio.twiml.VoiceResponse

// Handle incoming calls
router.post("/voice", async (req, res) => {
  const twiml = new VoiceResponse()
  const callSid = req.body.CallSid
  const from = req.body.From

  console.log(`📞 Incoming call from ${from}, CallSid: ${callSid}`)

  try {
    // Initialize call state
    callStateManager.initializeCall(callSid, from)

    // Welcome message
    const welcomeMessage = "Hello! I'm your AI assistant. How can I help you today?"

    // Welcome message using Twilio's TTS
    twiml.say({ voice: "Polly.Amy-Neural", language: "en-US" }, welcomeMessage)

    // Start recording and gather speech
    twiml.record({
      timeout: 5,
      transcribe: true,
      transcribeCallback: `/twilio/transcription/${callSid}`,
      action: `/twilio/handle-recording/${callSid}`,
      method: "POST",
    })

    res.type("text/xml")
    res.send(twiml.toString())
  } catch (error) {
    console.error("Error handling voice call:", error)
    twiml.say("Sorry, there was an error. Please try again later.")
    twiml.hangup()
    res.type("text/xml")
    res.send(twiml.toString())
  }
})

// Handle recording completion
router.post("/handle-recording/:callSid", async (req, res) => {
  const twiml = new VoiceResponse()
  const callSid = req.params.callSid
  const recordingUrl = req.body.RecordingUrl

  console.log(`🎙️ Recording completed for call ${callSid}`)

  try {
    // For now, we'll wait for transcription
    // In a production app, you might want to process the audio directly
    twiml.say({ voice: "alice" }, "I'm processing your message. Please hold on.")

    // Continue the conversation loop
    twiml.record({
      timeout: 10,
      transcribe: true,
      transcribeCallback: `/twilio/transcription/${callSid}`,
      action: `/twilio/handle-recording/${callSid}`,
      method: "POST",
    })

    res.type("text/xml")
    res.send(twiml.toString())
  } catch (error) {
    console.error("Error handling recording:", error)
    twiml.say("Sorry, there was an error processing your message.")
    twiml.hangup()
    res.type("text/xml")
    res.send(twiml.toString())
  }
})

// Handle transcription results
router.post("/transcription/:callSid", async (req, res) => {
  const callSid = req.params.callSid
  const transcriptionText = req.body.TranscriptionText

  console.log(`📝 Transcription for call ${callSid}: ${transcriptionText}`)

  if (!transcriptionText || transcriptionText.trim() === "") {
    console.log("Empty transcription received")
    return res.status(200).send("OK")
  }

  try {
    // Get AI response
    const aiResponse = await aiService.processMessage(callSid, transcriptionText)

    // Send response back to the call using Twilio's TTS
    await respondToCall(callSid, aiResponse)

    // Update call state
    callStateManager.addMessage(callSid, "user", transcriptionText)
    callStateManager.addMessage(callSid, "assistant", aiResponse)

    res.status(200).send("OK")
  } catch (error) {
    console.error("Error processing transcription:", error)
    res.status(500).send("Error")
  }
})

// Handle call status updates
router.post("/status", (req, res) => {
  const callSid = req.body.CallSid
  const callStatus = req.body.CallStatus

  console.log(`📊 Call ${callSid} status: ${callStatus}`)

  if (callStatus === "completed" || callStatus === "failed") {
    callStateManager.endCall(callSid)
  }

  res.status(200).send("OK")
})

// Helper function to respond to an active call with TTS
async function respondToCall(callSid, message) {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

    await client.calls(callSid).update({
      twiml: `<Response><Say voice="Polly.Amy-Neural" language="en-US">${message}</Say><Record timeout="10" transcribe="true" transcribeCallback="/twilio/transcription/${callSid}" action="/twilio/handle-recording/${callSid}" method="POST"/></Response>`,
    })
  } catch (error) {
    console.error("Error responding to call:", error)
  }
}

export default router
