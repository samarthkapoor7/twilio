import { createClient } from "@deepgram/sdk";

class DeepgramSTTService {
  constructor(apiKey) {
    this.deepgram = createClient(apiKey);
  }

  // Method to transcribe audio files (for recorded audio)
  async transcribeAudio(audioBuffer, callSid) {
    try {
      const buffer = Buffer.from(audioBuffer);
      const response = await this.deepgram.listen.prerecorded.transcribeFile(
        buffer,
        {
          model: "nova-2",
          language: "en-US",
          smart_format: true,
          punctuate: true,
          mime_type: "audio/mpeg",
        }
      );
      if (response?.result?.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
        return response.result.results.channels[0].alternatives[0].transcript;
      }
      return null;
    } catch (error) {
      console.error(`[STT] Error transcribing audio for call ${callSid}:`, error);
      throw error;
    }
  }
}

export default DeepgramSTTService;
