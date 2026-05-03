// app/services/userService.ts
import { apiClient } from './api';
import { Recipe } from './recipeService';

export interface User {
  id: string;
  username: string;
  name: string;
  avatar_url: string | null;
  email?: string;
  role?: string;
}

class UserService {
  async getProfile(): Promise<User> {
    return apiClient.get<User>('/users/profile');
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    return apiClient.patch<User>('/users/me', data);
  }

  async getRecipes(userId: string): Promise<Recipe[]> {
    return apiClient.get<Recipe[]>(`/recipes?user_id=${userId}`);
  }

  async getById(userId: string): Promise<User> {
    return apiClient.get<User>(`/users/${userId}`);
  }
}

export const userService = new UserService();
