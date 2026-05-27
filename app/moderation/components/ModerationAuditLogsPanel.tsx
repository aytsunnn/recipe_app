"use client";

import { useEffect, useState } from "react";
import { useUiFeedback } from "../../components/UiFeedbackProvider";
import { AuditLog, moderationService } from "../../services/moderationService";

export default function ModerationAuditLogsPanel() {
  const { toast } = useUiFeedback();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await moderationService.getAuditLogs();
      setLogs(data);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
      toast("Не удалось загрузить лог действий администраторов", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      void loadLogs();
    });
  }, []);

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("BLOCK")) {
      return (
        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-600 border border-red-100">
          Блокировка
        </span>
      );
    }
    if (act.includes("UNBLOCK")) {
      return (
        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-bold text-green-600 border border-green-100">
          Разблокировка
        </span>
      );
    }
    if (act.includes("ROLE")) {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-600 border border-amber-100">
          Смена роли
        </span>
      );
    }
    if (act.includes("DELETE")) {
      return (
        <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600 border border-rose-100">
          Удаление
        </span>
      );
    }
    if (act.includes("APPEAL") || act.includes("VERIFICATION")) {
      return (
        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-600 border border-indigo-100">
          Заявки
        </span>
      );
    }
    if (act.includes("BROADCAST")) {
      return (
        <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-1 text-xs font-bold text-purple-600 border border-purple-100">
          Рассылка
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-bold text-gray-600 border border-gray-100">
        Система
      </span>
    );
  };

  const getActionLabel = (action: string) => {
    switch (action.toUpperCase()) {
      case "UPDATE_ROLE":
        return "Изменение роли";
      case "BLOCK_USER":
        return "Блокировка пользователя";
      case "UNBLOCK_USER":
        return "Разблокировка пользователя";
      case "UNBLOCK_USER_VIA_APPEAL":
        return "Разблокировка (апелляция)";
      case "DELETE_RECIPE":
        return "Удаление рецепта";
      case "DELETE_COMMENT":
        return "Удаление комментария";
      case "PROCESS_VERIFICATION":
        return "Обработка верификации";
      case "PROCESS_APPEAL":
        return "Обработка апелляции";
      case "BROADCAST_NOTIFICATION":
        return "Массовая рассылка";
      case "BULK_BLOCK_USERS":
        return "Массовая блокировка";
      case "BULK_DELETE_RECIPES":
        return "Массовое удаление рецептов";
      case "UPDATE_USER":
        return "Обновление профиля";
      default:
        return action;
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.User?.username || "").toLowerCase().includes(search.toLowerCase()) ||
      (log.action || "").toLowerCase().includes(search.toLowerCase()) ||
      (log.entity || "").toLowerCase().includes(search.toLowerCase()) ||
      String(log.entity_id || "").includes(search);

    if (actionFilter === "all") return matchesSearch;
    if (actionFilter === "blocks") return matchesSearch && log.action.includes("BLOCK");
    if (actionFilter === "deletions") return matchesSearch && log.action.includes("DELETE");
    if (actionFilter === "roles") return matchesSearch && log.action.includes("ROLE");
    return matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Фильтры и поиск */}
      <div className="flex flex-col md:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по никнейму, действию, ID..."
          className="flex-1 h-10 rounded-xl border border-umami-light-gray/60 px-4 text-sm focus:border-umami-orange focus:outline-none bg-white"
        />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="h-10 rounded-xl border border-umami-light-gray/60 px-3 text-sm bg-white focus:outline-none"
        >
          <option value="all">Все действия</option>
          <option value="blocks">Блокировки/Разблокировки</option>
          <option value="deletions">Удаления данных</option>
          <option value="roles">Изменения ролей</option>
        </select>
      </div>

      {/* Таблица/Список логов */}
      <div className="rounded-2xl border border-umami-light-gray/50 bg-white p-4 md:p-6 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="font-inter text-sm text-umami-gray">Загрузка логов действий...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <h3 className="font-nunito text-base font-bold text-umami-dark-gray">
              Действия не найдены
            </h3>
            <p className="font-inter text-xs text-umami-gray mt-1">
              Не удалось найти записи о действиях администраторов по выбранным критериям.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-umami-light-gray/60">
                  <th className="pb-3 font-nunito text-xs font-bold text-umami-gray uppercase tracking-wider">
                    Администратор
                  </th>
                  <th className="pb-3 font-nunito text-xs font-bold text-umami-gray uppercase tracking-wider">
                    Тип действия
                  </th>
                  <th className="pb-3 font-nunito text-xs font-bold text-umami-gray uppercase tracking-wider">
                    Категория
                  </th>
                  <th className="pb-3 font-nunito text-xs font-bold text-umami-gray uppercase tracking-wider">
                    Объект
                  </th>
                  <th className="pb-3 font-nunito text-xs font-bold text-umami-gray uppercase tracking-wider">
                    Дата и время
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-umami-light-gray/40">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#fcfbf8]/40 transition-colors">
                    <td className="py-3.5 pr-3">
                      <span className="font-nunito text-sm font-bold text-umami-dark-gray">
                        @{log.User?.username || `ID ${log.admin_id}`}
                      </span>
                    </td>
                    <td className="py-3.5 pr-3">
                      <span className="font-inter text-sm text-umami-dark-gray">
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="py-3.5 pr-3">{getActionBadge(log.action)}</td>
                    <td className="py-3.5 pr-3">
                      {log.entity ? (
                        <div className="flex flex-col">
                          <span className="font-nunito text-xs font-bold text-umami-gray">
                            {log.entity}
                          </span>
                          <span className="font-inter text-xs text-umami-dark-gray">
                            ID: {String(log.entity_id)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-umami-gray">—</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      <span className="font-inter text-xs text-umami-gray">
                        {new Date(log.createdAt || log.created_at || "").toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
