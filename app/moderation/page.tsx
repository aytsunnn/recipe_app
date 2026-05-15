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
import { canAccessModeration, isAdminRole } from "../utils/role";
import { useUiFeedback } from "../components/UiFeedbackProvider";
import ModerationTabs from "./components/ModerationTabs";
import ReportsHeader from "./components/ReportsHeader";
import ModerationUserCard from "./components/ModerationUserCard";
import ModerationReportCard from "./components/ModerationReportCard";

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
  const [activeTab, setActiveTab] = useState<"reports" | "users">("reports");
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
      setIsAdmin(isAdminRole(role));
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
      return `/recipes/${report.recipe_id}?tab=comments&commentId=${commentId}#comment-${commentId}`;
    }
    if (report.type === "recipe" && report.recipe_id) {
      return `/recipes/${report.recipe_id}`;
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
      toast(
        error instanceof Error
          ? `Не удалось выполнить действие: ${error.message}`
          : "Не удалось выполнить действие"
      );
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
    const visibleIds = users.map((user) => String(user.id));
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
          <ModerationTabs activeTab={activeTab} onChange={setActiveTab} />

          <div className="rounded-[20px] border border-umami-light-gray/50 bg-white p-5">
            {activeTab === "reports" ? (
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
            ) : (
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
                      users.every((user) =>
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
                    {users.map((user) => {
                      const selected = selectedUserIds.includes(String(user.id));
                      return (
                        <ModerationUserCard
                          key={user.id}
                          user={user}
                          selected={selected}
                          onToggleSelect={() => toggleUserSelection(String(user.id))}
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
            )}
          </div>
        </div>
        <ScrollToTopButton anchorRef={moderationColumnRef} />
      </div>
    </div>
  );
}


