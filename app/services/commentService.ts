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
  // Заменяет localhost URL на публичный адрес
  private fixImageUrl(url: string | null): string | null {
    if (!url) return null;
    return url.replace('http://127.0.0.1:9000', 'http://188.233.238.70:9000');
  }

  // Исправляет URL аватара в комментарии
  private fixCommentImages(comment: Comment): Comment {
    return {
      ...comment,
      User: {
        ...comment.User,
        avatar_url: this.fixImageUrl(comment.User.avatar_url),
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
