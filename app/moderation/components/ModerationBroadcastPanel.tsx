"use client";

import { useState } from "react";
import { moderationService } from "../../services/moderationService";
import { useUiFeedback } from "../../components/UiFeedbackProvider";

export default function ModerationBroadcastPanel() {
  const { toast, confirm } = useUiFeedback();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast("Введите текст рассылки", "error");
      return;
    }

    const ok = await confirm("Отправить рассылку всем пользователям?");
    if (!ok) return;

    try {
      setSending(true);
      await moderationService.sendBroadcast(trimmed);
      toast("Рассылка отправлена", "success");
      setMessage("");
    } catch (error) {
      console.error("Ошибка отправки рассылки:", error);
      toast("Не удалось отправить рассылку", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h2 className="font-nunito text-base font-bold text-umami-dark-gray sm:text-lg">
        Глобальная рассылка
      </h2>
      <p className="mt-1 text-sm text-umami-gray">
        Сообщение будет отправлено всем пользователям приложения.
      </p>

      <div className="mt-3">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={6}
          maxLength={1000}
          placeholder="Введите текст уведомления..."
          className="w-full rounded-xl border border-umami-light-gray/60 px-3 py-2 text-sm text-umami-dark-gray outline-none focus:border-umami-orange/60"
        />
        <div className="mt-1 text-right text-xs text-umami-gray">{message.length} / 1000</div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending}
          className="rounded-full bg-umami-orange px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60 sm:px-4 sm:py-2 sm:text-sm"
        >
          {sending ? "Отправка..." : "Отправить рассылку"}
        </button>
      </div>
    </div>
  );
}
