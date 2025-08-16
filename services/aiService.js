import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import callStateManager from "./callStateManager.js";

class AIService {
  constructor() {
    this.systemPrompt = `You are a helpful AI assistant in a phone conversation. 
    Keep your responses concise and conversational, as they will be spoken aloud. 
    Avoid using special characters, numbers should be spelled out, and keep responses under 100 words.
    Be friendly, helpful, and natural in your speech patterns.`;
  }

  async processMessage(callSid, userMessage) {
    try {
      const messages = callStateManager.getMessages(callSid);
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
      conversationHistory.push({ role: "user", content: userMessage });

      const { text } = await generateText({
        model: openai("gpt-4o"),
        system: this.systemPrompt,
        messages: conversationHistory,
        maxTokens: 100,
        temperature: 0.6,
        timeout: 5000,
      });

      return text;
    } catch (error) {
      return "I'm sorry, I didn't catch that. Could you please repeat?";
    }
  }

  async generateInitialMessage(context = "") {
    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        system: this.systemPrompt,
        prompt: `Generate a brief, friendly greeting for starting a phone conversation. ${context}`,
        maxTokens: 50,
        temperature: 0.8,
      });
      return text;
    } catch (error) {
      return "Hello! I'm your AI assistant. How can I help you today?";
    }
  }
}

export default new AIService();