import { apiClient } from "./api";

export interface ModerationReport {
  id: string;
  type?: string;
  status?: "pending" | "reviewed" | "resolved" | "dismissed" | string;
  reason?: string;
  description?: string;
  recipe_id?: string | number | null;
  comment_id?: string | number | null;
  reported_user_id?: string | number | null;
  reporter_user_id?: string | number | null;
  target_type?: string | null;
  target_id?: string | number | null;
  createdAt?: string;
  updatedAt?: string;
  Recipe?: {
    id?: string | number;
    title?: string;
  } | null;
  Comment?: {
    id?: string | number;
    content?: string;
  } | null;
  ReportedUser?: {
    id?: string | number;
    username?: string;
    name?: string;
    is_blocked?: boolean;
  } | null;
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

export interface CreateReportData {
  type: "recipe" | "user" | "profile" | "comment";
  reason: string;
  description?: string;
  recipe_id?: number;
  reported_user_id?: number;
  comment_id?: number;
}

class ModerationService {
  async createReport(data: CreateReportData): Promise<void> {
    const payload: Record<string, unknown> = {
      type: data.type === "comment" ? "recipe" : data.type,
      reason: data.reason,
    };
    if (typeof data.recipe_id === "number") payload.recipe_id = data.recipe_id;
    if (typeof data.reported_user_id === "number") {
      payload.reported_user_id = data.reported_user_id;
    }
    const details: string[] = [];
    if (typeof data.comment_id === "number") {
      details.push(`comment_id=${data.comment_id}`);
    }
    if (data.description?.trim()) details.push(data.description.trim());
    if (details.length > 0) payload.description = details.join("\n");

    await apiClient.post("/reports", payload);
  }

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

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/admin/users/${id}`);
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
