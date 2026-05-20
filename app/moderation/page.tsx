"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import LeftPart from "../components/MainScreen/NavigationLeftPart";
import ScrollToTopButton from "../components/ScrollToTopButton";
import { authService } from "../services/authService";
import {
  moderationService,
  ModerationReport,
  ModerationUser,
} from "../services/moderationService";
import { uploadService } from "../services/uploadService";
import { normalizeImageUrl } from "../utils/imageUrl";
import { canAccessModeration, isAdminRole } from "../utils/role";
import { useUiFeedback } from "../components/UiFeedbackProvider";
import ModerationTabs from "./components/ModerationTabs";
import ReportsHeader from "./components/ReportsHeader";
import ModerationUserCard from "./components/ModerationUserCard";
import ModerationReportCard from "./components/ModerationReportCard";
import WeekMenuAdminPanel from "./components/WeekMenuAdminPanel";
import ModerationAnalyticsPanel from "./components/ModerationAnalyticsPanel";
import ModerationBroadcastPanel from "./components/ModerationBroadcastPanel";
import ModerationMetaPanel from "./components/ModerationMetaPanel";

const toIdList = (value: string): number[] =>
  value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);

export default function ModerationPage() {
  const { toast } = useUiFeedback();
  const USERS_LIMIT = 20;
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "analytics" | "reports" | "users" | "week-menu" | "broadcast" | "meta"
  >("reports");
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [users, setUsers] = useState<ModerationUser[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reportsFilter, setReportsFilter] = useState<
    "in_work" | "resolved_group"
  >("in_work");
  const [resolvedActionByReport, setResolvedActionByReport] = useState<
    Record<string, "accept" | "block-user">
  >({});
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
  const [editRoleId, setEditRoleId] = useState<number>(2);
  const [editIsVerified, setEditIsVerified] = useState(false);
  const [editIsBlocked, setEditIsBlocked] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const moderationColumnRef = useRef<HTMLDivElement | null>(null);

  const loadReports = async () => {
    try {
      const reportsResult = await moderationService.getReports();
      setReports(reportsResult);
    } catch (error) {
      console.error("Ошибка загрузки жалоб:", error);
      setReports([]);
    }
  };

  const loadUsers = async (page = 1) => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const usersResult = await moderationService.getUsers(page, USERS_LIMIT);
      setUsers(usersResult.items);
      setUsersPage(usersResult.page);
      setUsersTotalPages(usersResult.totalPages);
      setUsersTotal(usersResult.total);
      setSelectedUserIds([]);
    } catch (error) {
      console.error("Ошибка загрузки пользователей модерации:", error);
      setUsers([]);
      setUsersTotal(0);
      setUsersTotalPages(1);
      setUsersError(
        error instanceof Error ? error.message : "Не удалось загрузить пользователей"
      );
    } finally {
      setUsersLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadReports(), loadUsers(1)]);
    } catch (error) {
      console.error("Ошибка загрузки модерации:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      const me = await authService.getCurrentUser();
      const role = me?.role || authService.getRoleFromToken();
      const allowed = canAccessModeration(role);
      const admin = isAdminRole(role);
      setIsAdmin(admin);
      setActiveTab(admin ? "analytics" : "reports");
      setIsAllowed(allowed);
      if (!allowed) return;
      await loadData();
    };
    void bootstrap();
  }, []);

  useEffect(() => {
    if (isAllowed && activeTab === "users") {
      void loadUsers(1);
    }
  }, [activeTab, isAllowed]);

  const blockedUsersCount = useMemo(
    () => users.filter((user) => user.is_blocked).length,
    [users]
  );
  const sortedUsers = useMemo(() => {
    const roleOrder = (user: ModerationUser) => {
      if (user.role_id === 1) return 0;
      if (user.role_id === 3) return 1;
      if (user.role_id === 2) return 2;

      const normalizedRole = (user.role || "").toLowerCase();
      if (normalizedRole.includes("admin")) return 0;
      if (normalizedRole.includes("moderator")) return 1;
      return 2;
    };

    return [...users].sort((left, right) => {
      const roleDiff = roleOrder(left) - roleOrder(right);
      if (roleDiff !== 0) return roleDiff;
      return String(left.id).localeCompare(String(right.id), "ru");
    });
  }, [users]);
  const filteredReports = useMemo(() => {
    if (reportsFilter === "in_work") {
      return reports.filter((report) => {
        const status = (report.status || "").toLowerCase();
        return status === "pending" || status === "reviewed";
      });
    }
    return reports.filter((report) => {
      const status = (report.status || "").toLowerCase();
      return status === "resolved" || status === "dismissed";
    });
  }, [reports, reportsFilter]);

  useEffect(() => {
    if (reports.length === 0) return;
    if (filteredReports.length === 0 && reportsFilter === "in_work") {
      const hasResolved = reports.some((report) => {
        const status = (report.status || "").toLowerCase();
        return status === "resolved" || status === "dismissed";
      });
      if (hasResolved) {
        setReportsFilter("resolved_group");
      }
    }
  }, [reports, filteredReports.length, reportsFilter]);

  const formatDate = (value?: string) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const isSameMoment = (left?: string, right?: string): boolean => {
    if (!left || !right) return false;
    const leftTime = new Date(left).getTime();
    const rightTime = new Date(right).getTime();
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return false;
    return leftTime === rightTime;
  };

  const getReporterLabel = (report: ModerationReport) => {
    if (report.Reporter?.name) return report.Reporter.name;
    if (report.Reporter?.username) return `@${report.Reporter.username}`;
    if (report.reporter_user_id) return `ID ${report.reporter_user_id}`;
    return "Неизвестно";
  };

  const getTargetLabel = (report: ModerationReport) => {
    const commentId = getReportCommentId(report);
    const hasCommentTarget = Boolean(commentId);
    if (hasCommentTarget) {
      return `Комментарий ID ${commentId}`;
    }

    if (report.type === "recipe") {
      if (report.Recipe?.title) {
        return `Рецепт: ${report.Recipe.title} (ID ${
          report.recipe_id ?? report.Recipe.id ?? "—"
        })`;
      }
      return `Рецепт ID ${report.recipe_id ?? "—"}`;
    }
    if (report.type === "profile" || report.type === "user") {
      if (report.ReportedUser?.username || report.ReportedUser?.name) {
        return `Пользователь: ${report.ReportedUser?.name || "—"} (@${
          report.ReportedUser?.username || "—"
        })`;
      }
      return `Пользователь ID ${report.reported_user_id ?? "—"}`;
    }
    return `Тип: ${report.type || "unknown"}`;
  };

  const getTypeRu = (type?: string) => {
    const normalized = (type || "").toLowerCase();
    if (normalized === "recipe") return "Рецепт";
    if (normalized === "profile") return "Профиль";
    if (normalized === "user") return "Пользователь";
    if (normalized === "comment") return "Комментарий";
    return type || "Неизвестно";
  };

  const getStatusRu = (status?: string) => {
    const normalized = (status || "").toLowerCase();
    if (normalized === "pending") return "Новая";
    if (normalized === "reviewed") return "В работе";
    if (normalized === "resolved") return "Принято";
    if (normalized === "dismissed") return "Отказано";
    return status || "Неизвестно";
  };

  const getTargetHref = (report: ModerationReport): string | null => {
    const commentId = getReportCommentId(report);
    if (commentId && report.recipe_id) {
      return `/recipes/${report.recipe_id}?from=moderation&tab=comments&commentId=${commentId}#comment-${commentId}`;
    }
    if (report.type === "recipe" && report.recipe_id) {
      return `/recipes/${report.recipe_id}?from=moderation`;
    }
    if (
      (report.type === "profile" || report.type === "user") &&
      report.reported_user_id
    ) {
      return `/users/${report.reported_user_id}`;
    }
    return null;
  };

  const getReportedUserId = (report: ModerationReport): string | null => {
    if (
      report.reported_user_id !== null &&
      report.reported_user_id !== undefined
    ) {
      return String(report.reported_user_id);
    }
    if (
      report.ReportedUser?.id !== null &&
      report.ReportedUser?.id !== undefined
    ) {
      return String(report.ReportedUser.id);
    }
    return null;
  };

  const getUnavailableTargetMessage = (
    report: ModerationReport
  ): string | null => {
    const commentId = getReportCommentId(report);
    const hasCommentTarget = Boolean(commentId);
    const type = (report.type || "").toLowerCase();

    if (hasCommentTarget) {
      return null;
    }

    if (type === "recipe") {
      if (!report.recipe_id && !report.Recipe?.id) {
        return "Пост (рецепт) не существует или удален";
      }
      return null;
    }

    if (type === "profile" || type === "user") {
      if (report.ReportedUser?.is_blocked) return "Пользователь заблокирован";
      if (!report.reported_user_id && !report.ReportedUser?.id) {
        return "Пользователь удален или недоступен";
      }
      return null;
    }

    return null;
  };

  const getReportCommentId = (report: ModerationReport): string | null => {
    if (report.comment_id !== null && report.comment_id !== undefined) {
      return String(report.comment_id);
    }
    const description = report.description || "";
    const match = description.match(/comment_id\s*=\s*(\d+)/i);
    return match?.[1] || null;
  };

  const patchReportStatus = (reportId: string, status: string) => {
    setReports((prev) =>
      prev.map((item) =>
        String(item.id) === String(reportId)
          ? { ...item, status, updatedAt: new Date().toISOString() }
          : item
      )
    );
  };

  const patchResolvedAction = (
    reportId: string,
    action: "accept" | "block-user"
  ) => {
    setResolvedActionByReport((prev) => ({
      ...prev,
      [String(reportId)]: action,
    }));
  };

  const runAction = async (
    key: string,
    action: () => Promise<void>,
    onSuccess?: () => void
  ) => {
    try {
      setActionLoading(key);
      await action();
      onSuccess?.();
      await loadData();
    } catch (error) {
      console.error("Ошибка действия модерации:", error);
      toast("Не удалось выполнить действие");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleUserSelection = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = sortedUsers.map((user) => String(user.id));
    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds((prev) =>
        prev.filter((id) => !visibleIds.includes(String(id)))
      );
      return;
    }
    setSelectedUserIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const handleBulkBlock = async () => {
    const numericIds = selectedUserIds
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0);
    if (numericIds.length === 0) return;
    await runAction("bulk-block-users", async () => {
      await moderationService.bulkBlockUsers(numericIds, true);
      await loadUsers(usersPage);
    });
  };

  const handleUnblockUser = async (userId: string) => {
    await runAction(`user-${userId}-unblock`, async () => {
      await moderationService.unblockUser(userId);
      setUsers((prev) =>
        prev.map((user) =>
          String(user.id) === String(userId) ? { ...user, is_blocked: false } : user
        )
      );
    });
  };

  const handleBlockUser = async (userId: string) => {
    await runAction(`user-${userId}-block`, async () => {
      await moderationService.blockUser(userId);
      setUsers((prev) =>
        prev.map((user) =>
          String(user.id) === String(userId) ? { ...user, is_blocked: true } : user
        )
      );
    });
  };

  const handleDeleteUser = async (userId: string) => {
    const confirmed = window.confirm("Удалить пользователя? Это действие нельзя отменить.");
    if (!confirmed) return;
    await runAction(`user-${userId}-delete`, async () => {
      await moderationService.deleteUser(userId);
      await loadUsers(usersPage);
    });
  };

  const handleRoleUpdate = async (
    userId: string,
    role: "Admin" | "Moderator" | "User"
  ) => {
    const roleIdMap: Record<"Admin" | "Moderator" | "User", number> = {
      Admin: 1,
      User: 2,
      Moderator: 3,
    };
    const role_id = roleIdMap[role];
    await runAction(`user-${userId}-role`, async () => {
      await moderationService.updateUserRole(userId, role);
      setUsers((prev) =>
        prev.map((user) =>
          String(user.id) === String(userId) ? { ...user, role, role_id } : user
        )
      );
    });
  };

  const handleEditUser = async (
    userId: string,
    payload: {
      name?: string;
      username?: string;
      bio?: string | null;
      avatar_url?: string | null;
      role_id?: number;
      is_verified?: boolean;
      is_blocked?: boolean;
    }
  ) => {
    await runAction(`user-${userId}-edit`, async () => {
      await moderationService.updateUser(userId, payload);
      setUsers((prev) =>
        prev.map((user) =>
          String(user.id) === String(userId)
            ? {
                ...user,
                name: payload.name ?? user.name,
                username: payload.username ?? user.username,
                bio: payload.bio ?? user.bio,
                avatar_url:
                  payload.avatar_url === undefined
                    ? user.avatar_url
                    : payload.avatar_url,
                role_id: payload.role_id ?? user.role_id,
                role:
                  payload.role_id === 1
                    ? "Admin"
                    : payload.role_id === 3
                    ? "Moderator"
                    : payload.role_id === 2
                    ? "User"
                    : user.role,
                is_verified: payload.is_verified ?? user.is_verified,
                is_blocked: payload.is_blocked ?? user.is_blocked,
              }
            : user
        )
      );
    });
  };

  const openEditUserModal = (user: ModerationUser) => {
    setEditingUserId(String(user.id));
    setEditName(user.name || "");
    setEditUsername(user.username || "");
    setEditBio(user.bio || "");
    setEditAvatarUrl(user.avatar_url || null);
    setEditRoleId(user.role_id || (user.role?.toLowerCase().includes("admin") ? 1 : user.role?.toLowerCase().includes("moderator") ? 3 : 2));
    setEditIsVerified(Boolean(user.is_verified));
    setEditIsBlocked(Boolean(user.is_blocked));
  };

  const closeEditUserModal = () => {
    setEditingUserId(null);
  };

  const submitEditUserModal = async () => {
    if (!editingUserId) return;
    await handleEditUser(editingUserId, {
      name: editName.trim(),
      username: editUsername.trim(),
      bio: editBio.trim() || null,
      avatar_url: editAvatarUrl,
      role_id: editRoleId,
      is_verified: editIsVerified,
      is_blocked: editIsBlocked,
    });
    closeEditUserModal();
  };

  const handleEditAvatarFile = async (file: File) => {
    setAvatarUploading(true);
    try {
      const url = await uploadService.uploadImage(file, "avatars");
      setEditAvatarUrl(url);
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Не удалось загрузить аватар",
        "error"
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAcceptReport = async (report: ModerationReport) => {
    const reportType = (report.type || "").toLowerCase();
    const commentId = getReportCommentId(report);
    const recipeId = report.recipe_id ? String(report.recipe_id) : null;
    const reportedUserId = getReportedUserId(report);

    if (commentId) {
      await moderationService.deleteComment(commentId);
      await moderationService.updateReportStatus(report.id, "resolved");
      return;
    }

    if (reportType === "recipe" && recipeId) {
      await moderationService.deleteRecipe(recipeId);
      await moderationService.updateReportStatus(report.id, "resolved");
      return;
    }

    if ((reportType === "user" || reportType === "profile") && reportedUserId) {
      await moderationService.blockUser(reportedUserId);
      await moderationService.updateReportStatus(report.id, "resolved");
      return;
    }

    await moderationService.updateReportStatus(report.id, "resolved");
  };

  if (isAllowed === false) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="rounded-2xl bg-white px-5 py-4 text-sm text-umami-gray">
          Доступ к панели только для ролей Moderator и Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full gap-5">
      <div className="hidden w-55.75 lg:flex">
        <Suspense fallback={<div className="w-full" />}>
          <LeftPart />
        </Suspense>
      </div>

      <div
        ref={moderationColumnRef}
        className="relative w-full pb-10 lg:w-[calc(100%-223px-20px)]"
      >
        <div className="flex flex-col gap-4">
          <ModerationTabs activeTab={activeTab} onChange={setActiveTab} isAdmin={isAdmin} />

          <div className="rounded-[20px] border border-umami-light-gray/50 bg-white p-5">
            {activeTab === "analytics" && isAdmin ? (
              <ModerationAnalyticsPanel />
            ) : activeTab === "reports" ? (
              <>
            <ReportsHeader
              reportsCount={reports.length}
              reportsFilter={reportsFilter}
              onFilterChange={setReportsFilter}
            />
            {loading ? (
              <p className="mt-3 text-sm text-umami-gray">Загрузка...</p>
            ) : filteredReports.length === 0 ? (
              <p className="mt-3 text-sm text-umami-gray">Жалоб пока нет</p>
            ) : (
              <div className="mt-3 space-y-2">
                {filteredReports.map((report) => (
                  <ModerationReportCard
                    key={report.id}
                    report={report}
                    actionLoading={actionLoading}
                    resolvedAction={resolvedActionByReport[String(report.id)]}
                    typeLabel={getTypeRu(report.type)}
                    statusLabel={getStatusRu(report.status)}
                    reporterLabel={getReporterLabel(report)}
                    targetLabel={getTargetLabel(report)}
                    targetHref={getTargetHref(report)}
                    unavailableTargetMessage={getUnavailableTargetMessage(report)}
                    createdAtLabel={formatDate(report.createdAt)}
                    updatedAtLabel={formatDate(report.updatedAt)}
                    showUpdatedAt={!isSameMoment(report.createdAt, report.updatedAt)}
                    isUserTarget={["user", "profile"].includes(
                      (report.type || "").toLowerCase()
                    )}
                    commentActionLabel={
                      getReportCommentId(report)
                        ? "Принять и удалить комментарий"
                        : (report.type || "").toLowerCase() === "recipe"
                          ? "Принять и удалить рецепт"
                          : "Принять"
                    }
                    onSetReviewed={() =>
                      void runAction(
                        `report-${report.id}`,
                        () => moderationService.updateReportStatus(report.id, "reviewed"),
                        () => patchReportStatus(report.id, "reviewed")
                      )
                    }
                    onAccept={() =>
                      void runAction(
                        `report-${report.id}-accept`,
                        () => handleAcceptReport(report),
                        () => {
                          patchReportStatus(report.id, "resolved");
                          patchResolvedAction(report.id, "accept");
                        }
                      )
                    }
                    onBlockUser={() =>
                      void runAction(
                        `report-${report.id}-block`,
                        () => handleAcceptReport(report),
                        () => {
                          patchReportStatus(report.id, "resolved");
                          patchResolvedAction(report.id, "block-user");
                        }
                      )
                    }
                    onDismiss={() =>
                      void runAction(
                        `report-${report.id}-dismiss`,
                        () => moderationService.updateReportStatus(report.id, "dismissed"),
                        () => patchReportStatus(report.id, "dismissed")
                      )
                    }
                  />
                ))}
              </div>
            )}
              </>
            ) : activeTab === "users" ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-nunito text-lg font-bold text-umami-dark-gray">
                      Пользователи
                    </h2>
                    <p className="mt-1 text-sm text-umami-gray">
                      Всего: {usersTotal}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleSelectAllVisible}
                      className="rounded-full bg-[#f3efe2] px-3 py-1 text-xs font-bold text-umami-dark-gray hover:bg-[#ece4cf]"
                    >
                      {users.length > 0 &&
                      sortedUsers.every((user) =>
                        selectedUserIds.includes(String(user.id))
                      )
                        ? "Снять выбор"
                        : "Выбрать все"}
                    </button>
                    <button
                      type="button"
                      disabled={
                        selectedUserIds.length === 0 ||
                        actionLoading === "bulk-block-users"
                      }
                      onClick={() => void handleBulkBlock()}
                      className="rounded-full bg-umami-orange px-3 py-1 text-xs font-bold text-white disabled:opacity-60"
                    >
                      Заблокировать выбранных ({selectedUserIds.length})
                    </button>
                  </div>
                </div>

                {usersLoading ? (
                  <p className="mt-3 text-sm text-umami-gray">Загрузка...</p>
                ) : usersError ? (
                  <p className="mt-3 text-sm text-red-500">{usersError}</p>
                ) : users.length === 0 ? (
                  <p className="mt-3 text-sm text-umami-gray">
                    Пользователи не найдены
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {sortedUsers.map((user) => {
                      const selected = selectedUserIds.includes(String(user.id));
                      return (
                        <ModerationUserCard
                          key={user.id}
                          user={user}
                          isAdmin={isAdmin}
                          selected={selected}
                          onToggleSelect={() => toggleUserSelection(String(user.id))}
                          onBlock={() => void handleBlockUser(String(user.id))}
                          onUnblock={() => void handleUnblockUser(String(user.id))}
                          onDelete={() => void handleDeleteUser(String(user.id))}
                          onUpdateRole={(role) => void handleRoleUpdate(String(user.id), role)}
                          onEdit={() => openEditUserModal(user)}
                          actionLoading={actionLoading}
                        />
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={usersPage <= 1 || actionLoading === "users-page"}
                    onClick={() =>
                      void runAction("users-page", () => loadUsers(usersPage - 1))
                    }
                    className="rounded-full bg-[#f3efe2] px-3 py-1 text-xs font-bold text-umami-dark-gray disabled:opacity-60"
                  >
                    Назад
                  </button>
                  <p className="text-xs text-umami-gray">
                    Страница {usersPage} из {usersTotalPages}
                  </p>
                  <button
                    type="button"
                    disabled={
                      usersPage >= usersTotalPages ||
                      actionLoading === "users-page"
                    }
                    onClick={() =>
                      void runAction("users-page", () => loadUsers(usersPage + 1))
                    }
                    className="rounded-full bg-[#f3efe2] px-3 py-1 text-xs font-bold text-umami-dark-gray disabled:opacity-60"
                  >
                    Далее
                  </button>
                </div>
              </>
            ) : activeTab === "week-menu" && isAdmin ? (
              <WeekMenuAdminPanel />
            ) : activeTab === "broadcast" && isAdmin ? (
              <ModerationBroadcastPanel />
            ) : activeTab === "meta" && isAdmin ? (
              <ModerationMetaPanel />
            ) : null}
          </div>
        </div>
        <ScrollToTopButton anchorRef={moderationColumnRef} />
      </div>

      {editingUserId ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-umami-light-gray/50 bg-white p-5">
            <h3 className="font-nunito text-lg font-bold text-umami-dark-gray">
              Редактирование пользователя
            </h3>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm text-umami-gray">Аватар</span>
                <div className="flex items-center gap-3">
                  <img
                    src={normalizeImageUrl(editAvatarUrl, "/avatar.jpg")}
                    alt="avatar-preview"
                    className="h-14 w-14 rounded-full border border-umami-light-gray/50 object-cover"
                  />
                  <label className="cursor-pointer rounded-full bg-[#f3efe2] px-3 py-1 text-xs font-bold text-umami-dark-gray hover:bg-[#ece4cf]">
                    {avatarUploading ? "Загрузка..." : "Изменить фото"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void handleEditAvatarFile(file);
                        }
                      }}
                    />
                  </label>
                  {editAvatarUrl ? (
                    <button
                      type="button"
                      onClick={() => setEditAvatarUrl(null)}
                      className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600"
                    >
                      Удалить фото
                    </button>
                  ) : null}
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-umami-gray">Имя</span>
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="h-10 w-full rounded-xl border border-umami-light-gray/50 px-3 text-sm focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-umami-gray">Никнейм</span>
                <input
                  value={editUsername}
                  onChange={(event) => setEditUsername(event.target.value)}
                  className="h-10 w-full rounded-xl border border-umami-light-gray/50 px-3 text-sm focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-umami-gray">Bio</span>
                <textarea
                  value={editBio}
                  onChange={(event) => setEditBio(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-umami-light-gray/50 px-3 py-2 text-sm focus:outline-none"
                />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-sm text-umami-gray">Роль</span>
                  <select
                    value={editRoleId}
                    onChange={(event) => setEditRoleId(Number(event.target.value))}
                    className="h-10 w-full rounded-xl border border-umami-light-gray/50 px-3 text-sm focus:outline-none"
                  >
                    <option value={2}>User</option>
                    <option value={3}>Moderator</option>
                    <option value={1}>Admin</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 pt-7">
                  <input
                    type="checkbox"
                    checked={editIsVerified}
                    onChange={(event) => setEditIsVerified(event.target.checked)}
                    className="h-4 w-4 accent-umami-orange"
                  />
                  <span className="text-sm text-umami-dark-gray">Верифицирован</span>
                </label>
                <label className="flex items-center gap-2 pt-7">
                  <input
                    type="checkbox"
                    checked={editIsBlocked}
                    onChange={(event) => setEditIsBlocked(event.target.checked)}
                    className="h-4 w-4 accent-umami-orange"
                  />
                  <span className="text-sm text-umami-dark-gray">Заблокирован</span>
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-sm text-umami-gray">Email</span>
                <input
                  value={users.find((u) => String(u.id) === String(editingUserId))?.email || ""}
                  disabled
                  className="h-10 w-full rounded-xl border border-umami-light-gray/50 bg-[#f8f8f8] px-3 text-sm text-umami-gray"
                />
              </label>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeEditUserModal}
                className="rounded-full bg-[#f3efe2] px-4 py-2 text-sm font-bold text-umami-dark-gray"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => void submitEditUserModal()}
                disabled={actionLoading === `user-${editingUserId}-edit`}
                className="rounded-full bg-umami-orange px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


