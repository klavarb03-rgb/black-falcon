import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface Item {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  status: string;
  balance_status: 'on_balance' | 'off_balance';
  description?: string;
  document_number?: string;
  document_date?: string;
  supplier_name?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
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

  async getItems(params?: { 
    page?: number; 
    limit?: number; 
    balance_status?: 'on_balance' | 'off_balance' | 'all';
  }): Promise<ApiResponse<Item[]>> {
    const response = await this.client.get('/api/items', { params });
    return response.data;
  }

  async searchItems(query: string): Promise<Item[]> {
    const response = await this.getItems({ limit: 50 });
    // Client-side filtering (server doesn't support search yet)
    return response.data.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.description?.toLowerCase().includes(query.toLowerCase())
    );
  }

  async getItemById(id: string): Promise<Item> {
    const response = await this.client.get(`/api/items/${id}`);
    return response.data.data;
  }

  async createItem(item: Partial<Item>): Promise<Item> {
    const response = await this.client.post('/api/items', item);
    return response.data.data;
  }

  async updateItem(id: string, updates: Partial<Item>): Promise<Item> {
    const response = await this.client.put(`/api/items/${id}`, updates);
    return response.data.data;
  }

  async deleteItem(id: string): Promise<void> {
    await this.client.delete(`/api/items/${id}`);
  }

  async transferToBalance(id: string, data: {
    document_number: string;
    document_date: string;
    supplier_name: string;
  }): Promise<Item> {
    const response = await this.client.patch(`/api/items/${id}/transfer-to-balance`, data);
    return response.data.data;
  }

  async getDashboardStats(): Promise<any> {
    const response = await this.client.get('/api/dashboard/stats');
    return response.data.data;
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
