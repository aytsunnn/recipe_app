// app/services/commentService.ts
import { apiClient } from './api';

export interface Comment {
  id: string;
  user_id: string;
  recipe_id: string;
  content: string;
  rating?: number;
  parent_comment_id?: string | null;
  taste_sweet?: number;
  taste_sour?: number;
  taste_salty?: number;
  taste_spicy?: number;
  taste_umami?: number;
  createdAt: string;
  updatedAt: string;
  Author: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export interface CreateCommentData {
  content: string;
  rating: number;
  parent_comment_id?: string;
  taste_sweet?: number;
  taste_sour?: number;
  taste_salty?: number;
  taste_spicy?: number;
  taste_umami?: number;
}

class CommentService {
  // Заменяет localhost URL на публичный адрес
  private fixImageUrl(url: string | null): string | null {
    if (!url) return null;
    return url.replace('http://127.0.0.1:9000', 'http://188.233.238.70:9000');
  }

  // Исправляет URL аватара в комментарии
  private fixCommentImages(comment: Comment): Comment {
    return {
      ...comment,
      Author: {
        ...comment.Author,
        avatar_url: this.fixImageUrl(comment.Author.avatar_url),
      },
    };
  }

  // Получить комментарии рецепта
  async getByRecipe(recipeId: string): Promise<Comment[]> {
    const comments = await apiClient.get<Comment[]>(`/recipes/${recipeId}/comments`);
    return comments.map(comment => this.fixCommentImages(comment));
  }

  // Создать комментарий
  async create(recipeId: string, data: CreateCommentData): Promise<Comment> {
    const comment = await apiClient.post<Comment>(`/recipes/${recipeId}/comments`, data);
    return this.fixCommentImages(comment);
  }

  // Удалить комментарий
  async delete(recipeId: string, commentId: string): Promise<void> {
    return apiClient.delete(`/recipes/${recipeId}/comments/${commentId}`);
  }

  // Обновить комментарий
  async update(recipeId: string, commentId: string, data: CreateCommentData): Promise<Comment> {
    const comment = await apiClient.put<Comment>(`/recipes/${recipeId}/comments/${commentId}`, data);
    return this.fixCommentImages(comment);
  }
}

export const commentService = new CommentService();
