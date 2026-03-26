import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

interface ItemCreateDTO {
  name: string;
  status?: string;
  quantity?: number;
  unit?: string;
  description?: string;
  groupId?: string;
  donorId?: string;
  balance_status?: 'on_balance' | 'off_balance';
  document_number?: string;
  document_date?: string;
  supplier_name?: string;
}

interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

export class BlackFalconAPI {
  private client: AxiosInstance;

  constructor() {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    const apiToken = process.env.API_TOKEN || '';

    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken ? `Bearer ${apiToken}` : '',
      },
      timeout: 30000,
    });
  }

  async createItem(item: ItemCreateDTO): Promise<ApiResponse<any>> {
    const response = await this.client.post('/api/items', item);
    return response.data;
  }

  async bulkCreateItems(items: ItemCreateDTO[]): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        await this.createItem(items[i]);
        success++;
      } catch (error: any) {
        failed++;
        const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
        errors.push(`Рядок ${i + 2}: ${errorMsg}`); // +2 бо 1=header
      }
    }

    return { success, failed, errors };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}

export const api = new BlackFalconAPI();
