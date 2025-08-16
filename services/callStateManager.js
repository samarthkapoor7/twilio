class CallStateManager {
  constructor() {
    this.calls = new Map();
  }

  initializeCall(callSid, phoneNumber) {
    this.calls.set(callSid, {
      callSid,
      phoneNumber,
      startTime: new Date(),
      messages: [],
      status: "active",
    });
  }

  addMessage(callSid, role, content) {
    const call = this.calls.get(callSid);
    if (call) {
      call.messages.push({
        role,
        content,
        timestamp: new Date(),
      });
    }
  }

  getMessages(callSid) {
    const call = this.calls.get(callSid);
    return call ? call.messages : [];
  }

  getCallState(callSid) {
    return this.calls.get(callSid);
  }

  endCall(callSid) {
    const call = this.calls.get(callSid);
    if (call) {
      call.status = "completed";
      call.endTime = new Date();
      setTimeout(() => {
        this.calls.delete(callSid);
      }, 3600000);
    }
  }

  getAllActiveCalls() {
    return Array.from(this.calls.values()).filter(call => call.status === "active");
  }
}

export default new CallStateManager();
  