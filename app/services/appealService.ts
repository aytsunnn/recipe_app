// app/services/appealService.ts
import { apiClient } from './api';

export interface Appeal {
  id: string;
  user_id: string;
  message: string;
  status: 'pending' | 'reviewed' | 'resolved';
  admin_notes: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  User?: {
    id: string;
    username: string;
    name: string;
    avatar_url: string | null;
  };
}

class AppealService {
  async submitAppeal(message: string): Promise<{ message: string; appeal: Appeal }> {
    return apiClient.post<{ message: string; appeal: Appeal }>('/users/me/appeal', { message });
  }

  async getMyAppeals(): Promise<Appeal[]> {
    return apiClient.get<Appeal[]>('/users/me/appeal');
  }

  async getAppeals(): Promise<Appeal[]> {
    return apiClient.get<Appeal[]>('/admin/appeals');
  }

  async processAppeal(
    id: string | number,
    status: 'reviewed' | 'resolved',
    adminNotes?: string
  ): Promise<{ message: string; appeal: Appeal }> {
    return apiClient.patch<{ message: string; appeal: Appeal }>(`/admin/appeals/${id}`, {
      status,
      admin_notes: adminNotes,
    });
  }
}

export const appealService = new AppealService();
