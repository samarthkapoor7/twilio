import express from "express";
import twilio from "twilio";
import aiService from "../services/aiService.js";
import callStateManager from "../services/callStateManager.js";

const router = express.Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

router.post("/voice", async (req, res) => {
  const callSid = req.body.CallSid;
  const from = req.body.From;
  const twiml = new VoiceResponse();

  console.log(`📞 Incoming call from ${from}, CallSid: ${callSid}`);
  callStateManager.initializeCall(callSid, from);

  try {
    const gather = twiml.gather({
      input: "speech",
      action: `/twilio/handle-speech/${callSid}`,
      method: "POST",
      speechTimeout: "auto",
      language: "en-US",
    });

    gather.say(
      { voice: "Polly.Amy-Neural", language: "en-US" },
      "Hello! I'm your AI assistant. How can I help you today?"
    );

    // ❌ DO NOT redirect again — avoid loop!
    // twiml.redirect(`/twilio/voice`)

    res.type("text/xml").send(twiml.toString());
  } catch (error) {
    console.error("❌ Error in /voice:", error);
    twiml.say("Sorry, something went wrong.");
    twiml.hangup();
    res.type("text/xml").send(twiml.toString());
  }
});

// ✅ Handle speech result
router.post("/handle-speech/:callSid", async (req, res) => {
  const callSid = req.params.callSid;
  const speechResult = req.body.SpeechResult?.trim();
  const twiml = new VoiceResponse();

  try {
    console.log(`🗣️ Speech received for ${callSid}: ${speechResult}`);

    if (!speechResult) {
      twiml.say("Sorry, I didn't catch that. Please try again.");
      twiml.redirect(`/twilio/voice`);
      return res.type("text/xml").send(twiml.toString());
    }

    callStateManager.addMessage(callSid, "user", speechResult);

    const aiResponse = await aiService.processMessage(callSid, speechResult);
    callStateManager.addMessage(callSid, "assistant", aiResponse);

    const gather = twiml.gather({
      input: "speech",
      action: `/twilio/handle-speech/${callSid}`,
      method: "POST",
      speechTimeout: "auto",
      language: "en-US",
    });

    gather.say({ voice: "Polly.Amy-Neural", language: "en-US" }, aiResponse);
    twiml.redirect(`/twilio/voice`);

    res.type("text/xml").send(twiml.toString());
  } catch (error) {
    console.error("❌ Error in /handle-speech:", error);
    twiml.say("An error occurred. Goodbye.");
    twiml.hangup();
    res.type("text/xml").send(twiml.toString());
  }
});

// ✅ Handle call status updates
router.post("/status", (req, res) => {
  const callSid = req.body.CallSid;
  const status = req.body.CallStatus;

  console.log(`📊 Status update for ${callSid}: ${status}`);

  if (["completed", "failed", "busy", "no-answer"].includes(status)) {
    callStateManager.endCall(callSid);
  }

  res.status(200).send("OK");
});

export default router;
