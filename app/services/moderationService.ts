import { apiClient } from "./api";

export interface ModerationReport {
  id: string;
  type?: string;
  status?: "pending" | "reviewed" | "resolved" | "dismissed" | string;
  reason?: string;
  description?: string;
  recipe_id?: string | number | null;
  reported_user_id?: string | number | null;
  createdAt?: string;
  updatedAt?: string;
  Reporter?: {
    id: string;
    username?: string;
    name?: string;
  } | null;
}

export interface ModerationUser {
  id: string;
  username: string;
  name: string;
  role?: string;
  is_blocked?: boolean;
}

class ModerationService {
  async getReports(): Promise<ModerationReport[]> {
    return apiClient.get<ModerationReport[]>("/reports");
  }

  async updateReportStatus(
    id: string,
    status: "pending" | "reviewed" | "resolved" | "dismissed"
  ): Promise<void> {
    await apiClient.patch(`/reports/${id}`, { status });
  }

  async getUsers(): Promise<ModerationUser[]> {
    return apiClient.get<ModerationUser[]>("/admin/users");
  }

  async blockUser(id: string): Promise<void> {
    await apiClient.post(`/admin/users/${id}/block`);
  }

  async bulkBlockUsers(userIds: number[], isBlocked = true): Promise<void> {
    await apiClient.post("/admin/users/bulk-block", {
      userIds,
      is_blocked: isBlocked,
    });
  }

  async deleteRecipe(id: string): Promise<void> {
    await apiClient.delete(`/admin/recipes/${id}`);
  }

  async bulkDeleteRecipes(recipeIds: number[]): Promise<void> {
    await apiClient.post("/admin/recipes/bulk-delete", { recipeIds });
  }

  async deleteComment(id: string): Promise<void> {
    await apiClient.delete(`/admin/comments/${id}`);
  }
}

export const moderationService = new ModerationService();

