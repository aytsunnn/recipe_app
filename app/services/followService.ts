// app/services/followService.ts
import { apiClient } from './api';

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  createdAt: string;
}

class FollowService {
  // Подписаться на пользователя
  async follow(userId: string): Promise<{ message: string }> {
    console.log(`Attempting to follow user ${userId}`);
    try {
      const result = await apiClient.post<{ message: string }>(`/users/${userId}/follow`);
      console.log('Follow success:', result);
      return result;
    } catch (error) {
      console.error('Follow error:', error);
      throw error;
    }
  }

  // Отписаться от пользователя
  async unfollow(userId: string): Promise<{ message: string }> {
    console.log(`Attempting to unfollow user ${userId}`);
    try {
      const result = await apiClient.delete<{ message: string }>(`/users/${userId}/follow`);
      console.log('Unfollow success:', result);
      return result;
    } catch (error) {
      console.error('Unfollow error:', error);
      throw error;
    }
  }

  // Получить подписчиков пользователя
  async getFollowers(userId: string): Promise<Follow[]> {
    return apiClient.get<Follow[]>(`/users/${userId}/followers`);
  }

  // Получить подписки пользователя
  async getFollowing(userId: string): Promise<Follow[]> {
    return apiClient.get<Follow[]>(`/users/${userId}/following`);
  }
}

export const followService = new FollowService();
