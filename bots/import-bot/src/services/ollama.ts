import axios, { AxiosInstance } from 'axios';

export interface ParsedItem {
  name: string;
  serial?: string | null;
  quantity: number;
  unit: string;
  price?: number | null;
  notes?: string | null;
}

export interface OllamaVisionResponse {
  items: ParsedItem[];
}

export interface OllamaTextResponse {
  items: ParsedItem[];
}

const VISION_PROMPT = `You are an OCR assistant for inventory management system.

Your task: extract structured data from the image of a document (invoice, receipt, equipment list, etc.).

Output format: JSON array with items.

Each item should have:
- name (string, required) — full item name
- serial (string, optional) — serial number if present
- quantity (number, required) — quantity, default 1
- unit (string, required) — unit of measure: "шт", "кг", "л", "компл"
- price (number, optional) — price in UAH if present
- notes (string, optional) — any additional notes

Rules:
1. Extract ALL items from the document
2. If serial number is missing, set null
3. If quantity is missing, set 1
4. If unit is missing, set "шт"
5. If price is missing, set null
6. Clean up item names (remove extra spaces, correct typos if obvious)
7. If you see currency other than UAH, add note "Currency: [CODE]"

Example output:
{
  "items": [
    {
      "name": "Монітор Dell P2422H 24 дюйми",
      "serial": "ABC123456",
      "quantity": 5,
      "unit": "шт",
      "price": 12000,
      "notes": "Нові, в коробках"
    },
    {
      "name": "Системний блок HP ProDesk",
      "serial": "DEF789012",
      "quantity": 3,
      "unit": "шт",
      "price": 25000,
      "notes": null
    }
  ]
}

Now, analyze the image and return JSON only. No explanations.`;

const TEXT_PROMPT = `You are a data parser for inventory management system.

Your task: extract structured data from a table or text document (Excel, Word, plain text).

Input: text extracted from a file.

Output format: JSON array with items (same schema as vision task).

Each item should have:
- name (string, required) — full item name
- serial (string, optional) — serial number if present
- quantity (number, required) — quantity, default 1
- unit (string, required) — unit of measure: "шт", "кг", "л", "компл"
- price (number, optional) — price in UAH if present
- notes (string, optional) — any additional notes

Rules:
1. Detect table structure automatically (headers: Найменування, Кількість, Серійний номер, Ціна, тощо)
2. If no table, parse numbered/bullet lists
3. Skip empty rows
4. Skip header rows
5. Clean up item names
6. If quantity/unit missing, default to 1 шт

Example input (table):
Найменування | Серійний номер | Кількість | Ціна (грн)
Монітор Dell P2422H | ABC123456 | 5 | 12000
Системний блок HP | DEF789012 | 3 | 25000

Example output:
{
  "items": [
    {
      "name": "Монітор Dell P2422H",
      "serial": "ABC123456",
      "quantity": 5,
      "unit": "шт",
      "price": 12000,
      "notes": null
    },
    {
      "name": "Системний блок HP",
      "serial": "DEF789012",
      "quantity": 3,
      "unit": "шт",
      "price": 25000,
      "notes": null
    }
  ]
}

Now, parse the following text:

{TEXT}

Return JSON only. No explanations.`;

export class OllamaAPI {
  private client: AxiosInstance;
  private visionModel: string;
  private textModel: string;

  constructor() {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://204.168.134.255:11434';
    this.visionModel = process.env.OLLAMA_VISION_MODEL || 'llama3.2-vision:11b';
    this.textModel = process.env.OLLAMA_TEXT_MODEL || 'qwen2.5:7b';

    this.client = axios.create({
      baseURL: ollamaUrl,
      timeout: 120000, // 2 minutes for vision models
    });
  }

  /**
   * OCR для фото/PDF
   */
  async parseImageDocument(imageBase64: string): Promise<OllamaVisionResponse> {
    try {
      const response = await this.client.post('/api/generate', {
        model: this.visionModel,
        prompt: VISION_PROMPT,
        images: [imageBase64],
        stream: false,
        format: 'json',
      });

      const rawResponse = response.data.response;
      
      // Try to parse JSON from response
      let parsed: OllamaVisionResponse;
      try {
        parsed = JSON.parse(rawResponse);
      } catch {
        // If response is not valid JSON, try to extract JSON from text
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse Ollama response as JSON');
        }
      }

      // Validate response structure
      if (!parsed.items || !Array.isArray(parsed.items)) {
        throw new Error('Invalid response structure: missing items array');
      }

      return parsed;
    } catch (error: any) {
      console.error('Ollama Vision API error:', error.message);
      throw new Error(`Ollama Vision failed: ${error.message}`);
    }
  }

  /**
   * Parsing для тексту (Excel/Word)
   */
  async parseTextDocument(text: string): Promise<OllamaTextResponse> {
    try {
      const prompt = TEXT_PROMPT.replace('{TEXT}', text);

      const response = await this.client.post('/api/generate', {
        model: this.textModel,
        prompt,
        stream: false,
        format: 'json',
      });

      const rawResponse = response.data.response;

      // Try to parse JSON from response
      let parsed: OllamaTextResponse;
      try {
        parsed = JSON.parse(rawResponse);
      } catch {
        // If response is not valid JSON, try to extract JSON from text
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse Ollama response as JSON');
        }
      }

      // Validate response structure
      if (!parsed.items || !Array.isArray(parsed.items)) {
        throw new Error('Invalid response structure: missing items array');
      }

      return parsed;
    } catch (error: any) {
      console.error('Ollama Text API error:', error.message);
      throw new Error(`Ollama Text parsing failed: ${error.message}`);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/api/tags');
      return true;
    } catch {
      return false;
    }
  }
}

export const ollama = new OllamaAPI();
