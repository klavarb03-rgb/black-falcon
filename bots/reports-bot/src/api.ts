import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface DashboardStats {
  totalItems: number;
  onBalanceCount: number;
  offBalanceCount: number;
  recentOperations?: number;
  totalValue?: number;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
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

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.client.get<ApiResponse<DashboardStats>>('/api/dashboard/stats');
    return response.data.data;
  }

  async getRecentOperations(limit = 10): Promise<any[]> {
    const response = await this.client.get('/api/operations', {
      params: { limit, page: 1 }
    });
    return response.data.data || [];
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
