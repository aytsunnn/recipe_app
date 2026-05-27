"use client";

import { useEffect, useState } from "react";
import { useUiFeedback } from "../../components/UiFeedbackProvider";
import { Appeal, appealService } from "../../services/appealService";
import { normalizeImageUrl } from "../../utils/imageUrl";

export default function ModerationAppealsPanel() {
  const { toast } = useUiFeedback();
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed" | "resolved">("pending");

  const loadAppeals = async () => {
    try {
      setLoading(true);
      const result = await appealService.getAppeals();
      setAppeals(result);
    } catch (error) {
      console.error("Failed to load appeals:", error);
      toast("Не удалось загрузить список апелляций", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      void loadAppeals();
    });
  }, []);

  const handleProcess = async (appealId: string, status: "reviewed" | "resolved") => {
    const notes = adminNotes[appealId] || "";
    if (status === "reviewed" && !notes.trim()) {
      toast("При отклонении апелляции необходимо указать причину в комментарии", "error");
      return;
    }

    setProcessingId(appealId);
    try {
      const res = await appealService.processAppeal(appealId, status, notes.trim());
      toast(res.message || "Апелляция успешно обработана", "success");
      // Очищаем комментарий для этой апелляции
      setAdminNotes((prev) => {
        const next = { ...prev };
        delete next[appealId];
        return next;
      });
      // Перезагружаем список
      await loadAppeals();
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : "Ошибка при обработке апелляции", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredAppeals = appeals.filter((appeal) => {
    if (filter === "all") return true;
    return appeal.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-umami-orange/15 px-2.5 py-1 text-xs font-bold text-umami-orange">
            На рассмотрении
          </span>
        );
      case "reviewed":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-600">
            Отклонено
          </span>
        );
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
            Решено (Разблокирован)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Фильтры по статусу */}
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
        <button
          type="button"
          onClick={() => setFilter("pending")}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors sm:px-4 ${
            filter === "pending"
              ? "bg-umami-orange text-white"
              : "bg-[#f3efe2] text-umami-dark-gray hover:bg-[#ece4cf]"
          }`}
        >
          Новые (на рассмотрении)
        </button>
        <button
          type="button"
          onClick={() => setFilter("reviewed")}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors sm:px-4 ${
            filter === "reviewed"
              ? "bg-umami-orange text-white"
              : "bg-[#f3efe2] text-umami-dark-gray hover:bg-[#ece4cf]"
          }`}
        >
          Отклонённые
        </button>
        <button
          type="button"
          onClick={() => setFilter("resolved")}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors sm:px-4 ${
            filter === "resolved"
              ? "bg-umami-orange text-white"
              : "bg-[#f3efe2] text-umami-dark-gray hover:bg-[#ece4cf]"
          }`}
        >
          Одобренные (разблокированные)
        </button>
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors sm:px-4 ${
            filter === "all"
              ? "bg-umami-orange text-white"
              : "bg-[#f3efe2] text-umami-dark-gray hover:bg-[#ece4cf]"
          }`}
        >
          Все
        </button>
      </div>

      {/* Список апелляций */}
      <div className="rounded-2xl border border-umami-light-gray/50 bg-white p-4 md:p-6 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <span className="font-inter text-sm text-umami-gray">Загрузка апелляций...</span>
          </div>
        ) : filteredAppeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-umami-light-yellow/50 text-umami-orange">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.03 0 1.9.693 2.166 1.638m-7.377 2.24a4.5 4.5 0 1115.002 0c.002.083.002.166.002.25v12.75a2.25 2.25 0 01-2.25 2.25H9a2.25 2.25 0 01-2.25-2.25V6.108c0-.084 0-.167.002-.252z"
                />
              </svg>
            </div>
            <h3 className="font-nunito text-base font-bold text-umami-dark-gray mt-3">
              Нет апелляций
            </h3>
            <p className="font-inter text-xs text-umami-gray mt-1 max-w-xs">
              В данной категории на данный момент нет апелляций от заблокированных пользователей.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppeals.map((appeal) => (
              <div
                key={appeal.id}
                className="rounded-2xl border border-umami-light-gray/40 p-4 md:p-5 hover:border-umami-orange/20 transition-all flex flex-col gap-4"
              >
                {/* Заголовок карточки: Инфо о юзере и дата */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={normalizeImageUrl(appeal.User?.avatar_url, "/avatar.jpg")}
                      alt={appeal.User?.name || "avatar"}
                      className="h-10 w-10 rounded-full border border-umami-light-gray/50 object-cover"
                    />
                    <div>
                      <p className="font-nunito text-sm font-bold text-umami-dark-gray">
                        {appeal.User?.name || "Пользователь"}
                      </p>
                      <p className="font-inter text-xs text-umami-gray">
                        @{appeal.User?.username || "username"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-inter text-xs text-umami-gray">
                      {new Date(appeal.createdAt || appeal.created_at || "").toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {getStatusBadge(appeal.status)}
                  </div>
                </div>

                {/* Текст обращения */}
                <div className="rounded-xl bg-[#fcfbf8] border border-umami-light-gray/50 p-4">
                  <p className="font-nunito text-xs font-bold text-umami-gray mb-1">
                    Текст обращения:
                  </p>
                  <p className="font-inter text-sm text-umami-dark-gray break-words leading-relaxed whitespace-pre-wrap">
                    {appeal.message}
                  </p>
                </div>

                {/* Ввод ответа (комментария) и действия модератора */}
                {appeal.status === "pending" ? (
                  <div className="flex flex-col gap-3 mt-1">
                    <label className="block">
                      <span className="block font-nunito text-xs font-bold text-umami-dark-gray mb-1.5">
                        Комментарий модератора (обязателен при отклонении):
                      </span>
                      <textarea
                        value={adminNotes[appeal.id] || ""}
                        onChange={(e) =>
                          setAdminNotes((prev) => ({ ...prev, [appeal.id]: e.target.value }))
                        }
                        rows={2}
                        maxLength={500}
                        className="w-full rounded-xl border border-umami-light-gray/60 px-3.5 py-2 text-sm focus:border-umami-orange focus:outline-none"
                        placeholder="Укажите причину решения для информирования пользователя..."
                      />
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleProcess(appeal.id, "resolved")}
                        disabled={processingId !== null}
                        className="rounded-full bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                      >
                        Одобрить и разблокировать
                      </button>
                      <button
                        type="button"
                        onClick={() => handleProcess(appeal.id, "reviewed")}
                        disabled={processingId !== null}
                        className="rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                      >
                        Отклонить апелляцию
                      </button>
                    </div>
                  </div>
                ) : (
                  appeal.admin_notes && (
                    <div className="rounded-xl border border-umami-light-gray/30 bg-[#f7f5f0]/30 p-3.5">
                      <p className="font-nunito text-xs font-bold text-umami-gray mb-1">
                        Комментарий модератора:
                      </p>
                      <p className="font-inter text-xs text-umami-dark-gray break-words">
                        {appeal.admin_notes}
                      </p>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
