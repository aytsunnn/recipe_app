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
  avatar_url?: string | null;
  role?: string;
  is_blocked?: boolean;
}

export interface ModerationUsersPage {
  items: ModerationUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
  private normalizeUsers(rawList: unknown[]): ModerationUser[] {
    return rawList
      .map((entry) => {
        const raw = (entry || {}) as Record<string, unknown>;
        const source = (
          raw.User ||
          raw.user ||
          raw.profile ||
          raw
        ) as Record<string, unknown>;

        const id =
          source.id !== null && source.id !== undefined
            ? String(source.id)
            : raw.id !== null && raw.id !== undefined
            ? String(raw.id)
            : "";
        if (!id) return null;

        return {
          id,
          username:
            typeof source.username === "string"
              ? source.username
              : typeof raw.username === "string"
              ? raw.username
              : "",
          name:
            typeof source.name === "string"
              ? source.name
              : typeof raw.name === "string"
              ? raw.name
              : "",
          avatar_url:
            typeof source.avatar_url === "string"
              ? source.avatar_url
              : typeof raw.avatar_url === "string"
              ? raw.avatar_url
              : null,
          role:
            typeof source.role === "string"
              ? source.role
              : typeof raw.role === "string"
              ? raw.role
              : undefined,
          is_blocked:
            typeof source.is_blocked === "boolean"
              ? source.is_blocked
              : typeof raw.is_blocked === "boolean"
              ? raw.is_blocked
              : false,
        } as ModerationUser;
      })
      .filter((user): user is ModerationUser => Boolean(user));
  }

  private extractUsersArray(payload: unknown): unknown[] {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    const raw = payload as Record<string, unknown>;

    const directCandidates = [
      raw.users,
      raw.Users,
      raw.items,
      raw.rows,
      raw.data,
    ];
    for (const candidate of directCandidates) {
      if (Array.isArray(candidate)) return candidate;
    }

    if (raw.data && typeof raw.data === "object") {
      const data = raw.data as Record<string, unknown>;
      const nestedCandidates = [data.users, data.Users, data.items, data.rows];
      for (const candidate of nestedCandidates) {
        if (Array.isArray(candidate)) return candidate;
      }
    }

    return [];
  }

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

  async getUsers(page = 1, limit = 20): Promise<ModerationUsersPage> {
    const response = await apiClient.get<unknown>("/admin/users");

    if (Array.isArray(response)) {
      const full = this.normalizeUsers(response as unknown[]);
      const start = (Math.max(1, page) - 1) * Math.max(1, limit);
      const end = start + Math.max(1, limit);
      return {
        items: full.slice(start, end),
        total: full.length,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(full.length / Math.max(1, limit))),
      };
    }

    const raw = (response || {}) as Record<string, unknown>;
    const list = this.normalizeUsers(this.extractUsersArray(response));

    const nestedData =
      raw.data && typeof raw.data === "object"
        ? (raw.data as Record<string, unknown>)
        : null;
    const pagination = (
      raw.pagination ||
      (nestedData?.pagination as Record<string, unknown>) ||
      {}
    ) as Record<string, unknown>;
    const total =
      typeof pagination.total === "number"
        ? pagination.total
        : typeof raw.total === "number"
        ? raw.total
        : typeof nestedData?.total === "number"
        ? nestedData.total
        : list.length;
    const resolvedPage =
      typeof pagination.page === "number"
        ? pagination.page
        : typeof raw.page === "number"
        ? raw.page
        : typeof nestedData?.page === "number"
        ? nestedData.page
        : page;
    const resolvedLimit =
      typeof pagination.limit === "number"
        ? pagination.limit
        : typeof raw.limit === "number"
        ? raw.limit
        : typeof nestedData?.limit === "number"
        ? nestedData.limit
        : limit;
    const totalPages =
      typeof pagination.totalPages === "number"
        ? pagination.totalPages
        : Math.max(1, Math.ceil(total / Math.max(1, resolvedLimit)));

    if (list.length === 0) {
      throw new Error("API /admin/users вернул пустой или неподдерживаемый формат");
    }

    return {
      items: list,
      total,
      page: resolvedPage,
      limit: resolvedLimit,
      totalPages,
    };
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
