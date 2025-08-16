import express from "express";
import twilio from "twilio";
import aiService from "../services/aiService.js";
import callStateManager from "../services/callStateManager.js";
import DeepgramSTTService from "../services/deepgramSTT.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const VoiceResponse = twilio.twiml.VoiceResponse;
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const sttService = new DeepgramSTTService(process.env.DEEPGRAM_API_KEY);

router.post("/voice", async (req, res) => {
  const callSid = req.body.CallSid;
  const from = req.body.From;
  const twiml = new VoiceResponse();

  if (!callStateManager.getCallState(callSid)) {
    callStateManager.initializeCall(callSid, from);
    console.log(`📞 Incoming call from ${from}, CallSid: ${callSid}`);
    twiml.say(
      { voice: "Polly.Amy-Neural", language: "en-US" },
      "Hello! How can I help you today?"
    );
  }

  try {
    console.log(`🎤 Listening for user input (recording started) for CallSid: ${callSid}`);
    twiml.record({
      action: `${process.env.BASE_URL}/twilio/process-audio`,
      method: 'POST',
      maxLength: 30,
      playBeep: true,
      trim: 'trim-silence',
      recordingStatusCallback: `${process.env.BASE_URL}/twilio/recording-status`,
      recordingStatusCallbackMethod: 'POST'
    });
    twiml.say(
      { voice: "Polly.Amy-Neural", language: "en-US" },
      "I didn't hear anything. Please try again."
    );
    twiml.redirect('/twilio/voice');
    res.type("text/xml").send(twiml.toString());
  } catch (error) {
    console.error("❌ Error in /voice:", error);
    twiml.say("Sorry, something went wrong.");
    twiml.hangup();
    res.type("text/xml").send(twiml.toString());
  }
});

router.post("/status", (req, res) => {
  const callSid = req.body.CallSid;
  const status = req.body.CallStatus;
  if (["completed", "failed", "busy", "no-answer"].includes(status)) {
    callStateManager.endCall(callSid);
    console.log(`📞 Call ended: ${callSid} (status: ${status})`);
  }
  res.status(200).send("OK");
});

router.post("/process-audio", async (req, res) => {
  const { CallSid: callSid, RecordingUrl: recordingUrl, RecordingDuration: recordingDuration } = req.body;
  if (!recordingUrl || recordingDuration <= 0) {
    const twiml = new VoiceResponse();
    twiml.say("I didn't receive any audio. Please try again.");
    twiml.redirect('/twilio/voice');
    return res.type("text/xml").send(twiml.toString());
  }
  try {
    const transcript = await processAudioWithDeepgram(recordingUrl, callSid);
    if (transcript?.trim()) {
      console.log(`📝 Transcription received for CallSid ${callSid}: "${transcript}"`);
      const lowerTranscript = transcript.toLowerCase();
      if (lowerTranscript.includes('goodbye') || lowerTranscript.includes('bye') || 
          lowerTranscript.includes('end call') || lowerTranscript.includes('hang up') ||
          lowerTranscript.includes('that\'s all') || lowerTranscript.includes('nothing else')) {
        console.log(`👋 User ended the call (goodbye detected) for CallSid: ${callSid}`);
        const twiml = new VoiceResponse();
        twiml.say("Thank you for calling! Have a great day. Goodbye!");
        twiml.hangup();
        return res.type("text/xml").send(twiml.toString());
      }
      callStateManager.addMessage(callSid, "user", transcript);
      const aiResponse = await aiService.processMessage(callSid, transcript);
      console.log(`🤖 AI response for CallSid ${callSid}: "${aiResponse}"`);
      callStateManager.addMessage(callSid, "assistant", aiResponse);
      const twiml = new VoiceResponse();
      twiml.say(aiResponse);
      twiml.redirect('/twilio/voice');
      return res.type("text/xml").send(twiml.toString());
    } else {
      const twiml = new VoiceResponse();
      twiml.say("I couldn't understand what you said. Please try speaking more clearly.");
      twiml.redirect('/twilio/voice');
      return res.type("text/xml").send(twiml.toString());
    }
  } catch (error) {
    console.error(`❌ Error processing audio for CallSid ${callSid}:`, error);
    const twiml = new VoiceResponse();
    twiml.say("I'm sorry, I encountered an error processing your audio. Please try again.");
    twiml.redirect('/twilio/voice');
    return res.type("text/xml").send(twiml.toString());
  }
});

router.post("/recording-status", (req, res) => {
  res.status(200).send("OK");
});

async function processAudioWithDeepgram(audioUrl, callSid) {
  try {
    const recordingSid = audioUrl.split('/').pop();
    await new Promise(resolve => setTimeout(resolve, 3000));
    let audioBuffer = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const recording = await twilioClient.recordings(recordingSid).fetch();
        const mediaUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Recordings/${recordingSid}.mp3`;
        const response = await fetch(mediaUrl, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`
          }
        });
        if (response.ok) {
          audioBuffer = await response.arrayBuffer();
          break;
        }
      } catch (error) {
        if (attempt === 3) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    if (!audioBuffer) {
      throw new Error('Failed to download audio');
    }
    return await sttService.transcribeAudio(audioBuffer, callSid);
  } catch (error) {
    throw error;
  }
}

export default router;
