// app/services/commentService.ts
import { apiClient } from './api';

export interface Comment {
  id: string;
  user_id: string;
  recipe_id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  User: {
    id: string;
    username: string;
    name: string;
    avatar_url: string | null;
  };
}

export interface CreateCommentData {
  content: string;
}

class CommentService {
  // Получить комментарии рецепта
  async getByRecipe(recipeId: string): Promise<Comment[]> {
    return apiClient.get<Comment[]>(`/recipes/${recipeId}/comments`);
  }

  // Создать комментарий
  async create(recipeId: string, data: CreateCommentData): Promise<Comment> {
    return apiClient.post<Comment>(`/recipes/${recipeId}/comments`, data);
  }

  // Удалить комментарий
  async delete(recipeId: string, commentId: string): Promise<void> {
    return apiClient.delete(`/recipes/${recipeId}/comments/${commentId}`);
  }

  // Обновить комментарий
  async update(recipeId: string, commentId: string, data: CreateCommentData): Promise<Comment> {
    return apiClient.put<Comment>(`/recipes/${recipeId}/comments/${commentId}`, data);
  }
}

export const commentService = new CommentService();
