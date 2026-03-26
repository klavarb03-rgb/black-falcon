import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs';

export interface WhisperResponse {
  text: string;
}

export class WhisperAPI {
  private client: AxiosInstance;

  constructor() {
    const whisperUrl = process.env.WHISPER_URL || 'http://localhost:9000';

    this.client = axios.create({
      baseURL: whisperUrl,
      timeout: 60000, // 1 minute
    });
  }

  /**
   * Транскрибувати аудіо файл
   */
  async transcribe(audioPath: string, language: string = 'uk'): Promise<WhisperResponse> {
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioPath));
      formData.append('language', language);

      const response = await this.client.post('/transcribe', formData, {
        headers: formData.getHeaders(),
      });

      return { text: response.data.text || response.data };
    } catch (error: any) {
      console.error('Whisper API error:', error.message);
      throw new Error(`Whisper transcription failed: ${error.message}`);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/');
      return true;
    } catch {
      return false;
    }
  }
}

export const whisper = new WhisperAPI();
