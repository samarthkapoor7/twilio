import twilio from "twilio"
import dotenv from "dotenv"

dotenv.config()

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

class CallService {
  async initiateCall(phoneNumber, initialMessage = null) {
    try {
      const call = await client.calls.create({
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        url: `${process.env.BASE_URL}/twilio/voice`,
        statusCallback: `${process.env.BASE_URL}/twilio/status`,
        statusCallbackMethod: "POST",
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      })

      console.log(`📞 Call initiated: ${call.sid} to ${phoneNumber}`)
      return call
    } catch (error) {
      console.error("Error initiating call:", error)
      throw error
    }
  }

  async endCall(callSid) {
    try {
      await client.calls(callSid).update({ status: "completed" })
      console.log(`📞 Call ended: ${callSid}`)
    } catch (error) {
      console.error("Error ending call:", error)
      throw error
    }
  }

  async getCallStatus(callSid) {
    try {
      const call = await client.calls(callSid).fetch()
      return call.status
    } catch (error) {
      console.error("Error getting call status:", error)
      throw error
    }
  }
}

export default new CallService()
