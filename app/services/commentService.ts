// app/services/commentService.ts
import { apiClient } from './api';
import { normalizeImageUrl } from '../utils/imageUrl';

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
  Likes?: Array<{ id: string; user_id: string }>;
  _count?: {
    Likes?: number;
  };
  likes_count?: number;
  is_liked?: boolean;
  likeCount?: number;
  isLiked?: boolean;
  Replies?: Comment[];
}

export interface CreateCommentData {
  content: string;
  rating?: number | null;
  parent_comment_id?: number;
  taste_sweet?: number | null;
  taste_sour?: number | null;
  taste_salty?: number | null;
  taste_spicy?: number | null;
  taste_umami?: number | null;
}

class CommentService {
  private fixImageUrl(url: string | null): string | null {
    if (!url) return null;
    const normalized = normalizeImageUrl(url, "");
    return normalized || null;
  }

  private fixCommentImages(comment: Comment): Comment {
    const raw = comment as unknown as Record<string, unknown>;
    const normalizedLikesCount = (() => {
      const direct =
        typeof comment.likes_count === "number"
          ? comment.likes_count
          : typeof comment.likeCount === "number"
          ? comment.likeCount
          : typeof raw.likes_count === "number"
          ? (raw.likes_count as number)
          : typeof raw.likeCount === "number"
          ? (raw.likeCount as number)
          : typeof raw.likes_count === "string"
          ? Number(raw.likes_count)
          : typeof raw.likeCount === "string"
          ? Number(raw.likeCount)
          : null;
      return typeof direct === "number" && Number.isFinite(direct)
        ? Math.max(0, direct)
        : undefined;
    })();

    const normalizedIsLiked =
      typeof comment.is_liked === "boolean"
        ? comment.is_liked
        : typeof comment.isLiked === "boolean"
        ? comment.isLiked
        : typeof raw.is_liked === "boolean"
        ? (raw.is_liked as boolean)
        : typeof raw.isLiked === "boolean"
        ? (raw.isLiked as boolean)
        : undefined;

    return {
      ...comment,
      ...(normalizedLikesCount !== undefined
        ? {
            likes_count: normalizedLikesCount,
            likeCount: normalizedLikesCount,
            _count: {
              ...(comment._count || {}),
              Likes: normalizedLikesCount,
            },
          }
        : {}),
      ...(normalizedIsLiked !== undefined
        ? { is_liked: normalizedIsLiked, isLiked: normalizedIsLiked }
        : {}),
      Author: {
        ...comment.Author,
        avatar_url: this.fixImageUrl(comment.Author.avatar_url),
      },
      Replies: Array.isArray(comment.Replies)
        ? comment.Replies.map((reply) => this.fixCommentImages(reply))
        : comment.Replies,
    };
  }

  async getByRecipe(recipeId: string): Promise<Comment[]> {
    const comments = await apiClient.get<Comment[]>(`/recipes/${recipeId}/comments`);
    return comments.map((comment) => this.fixCommentImages(comment));
  }

  async create(recipeId: string, data: CreateCommentData): Promise<void> {
    // API может вернуть только message, поэтому не ожидаем объект Comment.
    await apiClient.post<unknown>(`/recipes/${recipeId}/comments`, data);
  }

  async delete(recipeId: string, commentId: string): Promise<void> {
    return apiClient.delete(`/recipes/${recipeId}/comments/${commentId}`);
  }

  async update(recipeId: string, commentId: string, data: CreateCommentData): Promise<Comment> {
    const comment = await apiClient.put<Comment>(`/recipes/${recipeId}/comments/${commentId}`, data);
    return this.fixCommentImages(comment);
  }

  async toggleLike(commentId: string): Promise<void> {
    await apiClient.post<unknown>(`/comments/${commentId}/like`);
  }
}

export const commentService = new CommentService();


