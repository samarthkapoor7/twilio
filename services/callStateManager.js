class CallStateManager {
    constructor() {
      this.calls = new Map()
    }
  
    initializeCall(callSid, phoneNumber) {
      this.calls.set(callSid, {
        callSid,
        phoneNumber,
        startTime: new Date(),
        messages: [],
        status: "active",
      })
  
      console.log(`📋 Initialized call state for ${callSid}`)
    }
  
    addMessage(callSid, role, content) {
      const call = this.calls.get(callSid)
      if (call) {
        call.messages.push({
          role,
          content,
          timestamp: new Date(),
        })
        console.log(`💬 Added ${role} message to call ${callSid}`)
      }
    }
  
    getMessages(callSid) {
      const call = this.calls.get(callSid)
      return call ? call.messages : []
    }
  
    getCallState(callSid) {
      return this.calls.get(callSid)
    }
  
    endCall(callSid) {
      const call = this.calls.get(callSid)
      if (call) {
        call.status = "completed"
        call.endTime = new Date()
        console.log(`📋 Call ${callSid} marked as completed`)
  
        // Clean up after 1 hour
        setTimeout(() => {
          this.calls.delete(callSid)
          console.log(`🗑️ Cleaned up call state for ${callSid}`)
        }, 3600000)
      }
    }
  
    getAllActiveCalls() {
      const activeCalls = []
      for (const [callSid, call] of this.calls.entries()) {
        if (call.status === "active") {
          activeCalls.push(call)
        }
      }
      return activeCalls
    }
  }
  
  export default new CallStateManager()
  