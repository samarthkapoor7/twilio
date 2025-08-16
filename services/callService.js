import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

class CallService {
  async initiateCall(phoneNumber, initialMessage = null) {
    const webhookUrl = process.env.TWILIO_WEBHOOK_URL || `${process.env.BASE_URL}/twilio/voice`;
    const statusUrl = process.env.TWILIO_STATUS_URL || `${process.env.BASE_URL}/twilio/status`;

    if (webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')) {
      throw new Error('Twilio cannot use localhost URLs. Please use a public HTTPS URL.');
    }
    if (statusUrl.includes('localhost') || statusUrl.includes('127.0.0.1')) {
      throw new Error('Twilio cannot use localhost URLs for status callbacks. Please use a public HTTPS URL.');
    }

    try {
      return await client.calls.create({
        url: webhookUrl,
        method: "POST",
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        statusCallback: statusUrl,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        statusCallbackMethod: "POST",
      });
    } catch (error) {
      throw error;
    }
  }

  async endCall(callSid) {
    try {
      await client.calls(callSid).update({ status: "completed" });
    } catch (error) {
      throw error;
    }
  }

  async getCallStatus(callSid) {
    try {
      const call = await client.calls(callSid).fetch();
      return call.status;
    } catch (error) {
      throw error;
    }
  }
}

export default new CallService();