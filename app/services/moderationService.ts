import { ApiError, apiClient } from "./api";

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
  email?: string;
  bio?: string | null;
  avatar_url?: string | null;
  role?: string;
  role_id?: number;
  is_blocked?: boolean;
  is_verified?: boolean;
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

export type AdminAnalyticsResponse = Record<string, unknown>;
export type MetaEntityType =
  | "categories"
  | "kitchens"
  | "cooking-types"
  | "celebrations"
  | "units"
  | "ingredients";
export type MetaItem = Record<string, unknown> & { id: string | number };

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
          email:
            typeof source.email === "string"
              ? source.email
              : typeof raw.email === "string"
              ? raw.email
              : "",
          avatar_url:
            typeof source.avatar_url === "string"
              ? source.avatar_url
              : typeof raw.avatar_url === "string"
              ? raw.avatar_url
              : null,
          bio:
            typeof source.bio === "string"
              ? source.bio
              : typeof raw.bio === "string"
              ? raw.bio
              : null,
          role:
            typeof source.role === "string"
              ? source.role
              : typeof raw.role === "string"
              ? raw.role
              : typeof (source.Role as { name?: string } | undefined)?.name === "string"
              ? String((source.Role as { name?: string }).name)
              : typeof (raw.Role as { name?: string } | undefined)?.name === "string"
              ? String((raw.Role as { name?: string }).name)
              : undefined,
          role_id:
            typeof source.role_id === "number"
              ? source.role_id
              : typeof raw.role_id === "number"
              ? raw.role_id
              : undefined,
          is_blocked:
            typeof source.is_blocked === "boolean"
              ? source.is_blocked
              : typeof raw.is_blocked === "boolean"
              ? raw.is_blocked
              : false,
          is_verified:
            typeof source.is_verified === "boolean"
              ? source.is_verified
              : typeof raw.is_verified === "boolean"
              ? raw.is_verified
              : undefined,
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
    const endpoints = ["/reports", "/admin/reports"];
    let lastError: unknown = null;
    for (const endpoint of endpoints) {
      try {
        const response = await apiClient.get<unknown>(endpoint);
        if (Array.isArray(response)) {
          return response as ModerationReport[];
        }
        if (response && typeof response === "object") {
          const raw = response as Record<string, unknown>;
          const candidates = [raw.reports, raw.items, raw.data, raw.rows];
          for (const candidate of candidates) {
            if (Array.isArray(candidate)) {
              return candidate as ModerationReport[];
            }
          }
        }
        return [];
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError instanceof ApiError && lastError.status === 403) {
      throw new Error(
        "У текущей роли нет прав на просмотр жалоб. Проверьте права роли на backend и выполните повторный вход."
      );
    }
    if (lastError instanceof Error) throw lastError;
    throw new Error("Не удалось загрузить жалобы");
  }

  async updateReportStatus(
    id: string,
    status: "pending" | "reviewed" | "resolved" | "dismissed"
  ): Promise<void> {
    await apiClient.patch(`/reports/${id}`, { status });
  }

  async getUsers(page = 1, limit = 20): Promise<ModerationUsersPage> {
    const endpoints = [
      "/admin/users",
      "/users/search?q=a",
      "/users/search?q=%D0%B0",
      "/users/search?q=e",
      "/users/search?q=%D0%B5",
    ];
    let response: unknown = null;
    let lastError: unknown = null;

    for (const endpoint of endpoints) {
      try {
        response = await apiClient.get<unknown>(endpoint);
        break;
      } catch (error) {
        lastError = error;
        if (error instanceof ApiError && error.status === 403) {
          continue;
        }
      }
    }

    if (response === null) {
      if (lastError instanceof ApiError && lastError.status === 403) {
        throw new Error(
          "У текущей роли нет прав на получение списка пользователей. Проверьте права роли на backend и выполните повторный вход."
        );
      }
      if (lastError instanceof Error) throw lastError;
      throw new Error("Не удалось получить список пользователей");
    }

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

  async unblockUser(id: string): Promise<void> {
    try {
      await apiClient.post(`/admin/users/${id}/unblock`);
      return;
    } catch {
      const numericId = Number(id);
      if (!Number.isFinite(numericId) || numericId <= 0) throw new Error("Некорректный ID пользователя");
      await apiClient.post("/admin/users/bulk-block", {
        userIds: [numericId],
        is_blocked: false,
      });
    }
  }

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/admin/users/${id}`);
  }

  async updateUserRole(id: string, role: "Admin" | "Moderator" | "User"): Promise<void> {
    const roleIdMap: Record<"Admin" | "Moderator" | "User", number> = {
      Admin: 1,
      User: 2,
      Moderator: 3,
    };
    const role_id = roleIdMap[role];
    await apiClient.patch(`/admin/users/${id}`, { role_id });
  }

  async updateUser(
    id: string,
    payload: {
      name?: string;
      username?: string;
      bio?: string | null;
      avatar_url?: string | null;
      role_id?: number;
      is_blocked?: boolean;
      is_verified?: boolean;
    }
  ): Promise<void> {
    await apiClient.patch(`/admin/users/${id}`, payload);
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

  async getAnalytics(): Promise<AdminAnalyticsResponse> {
    const data = await apiClient.get<unknown>("/admin/analytics");
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return data as AdminAnalyticsResponse;
    }
    if (Array.isArray(data)) {
      return { items: data };
    }
    return {};
  }

  async sendBroadcast(message: string): Promise<void> {
    await apiClient.post("/admin/notifications/broadcast", { message });
  }

  async getMetaItems(type: MetaEntityType): Promise<MetaItem[]> {
    const data = await apiClient.get<unknown>(`/meta/${type}`);
    if (Array.isArray(data)) return data as MetaItem[];
    if (data && typeof data === "object") {
      const raw = data as Record<string, unknown>;
      const candidate = raw.items || raw.data || raw.rows;
      if (Array.isArray(candidate)) return candidate as MetaItem[];
    }
    return [];
  }

  async createMetaItem(
    type: MetaEntityType,
    payload: Record<string, unknown>
  ): Promise<MetaItem> {
    return apiClient.post<MetaItem>(`/meta/${type}`, payload);
  }

  async updateMetaItem(
    type: MetaEntityType,
    id: string | number,
    payload: Record<string, unknown>
  ): Promise<MetaItem> {
    return apiClient.put<MetaItem>(`/meta/${type}/${id}`, payload);
  }

  async deleteMetaItem(type: MetaEntityType, id: string | number): Promise<void> {
    await apiClient.delete(`/meta/${type}/${id}`);
  }
}

export const moderationService = new ModerationService();
