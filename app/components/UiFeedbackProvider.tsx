"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";

type ToastType = "info" | "success" | "error";

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

type ReportResult = {
  reason: string;
  description: string;
};

type UiFeedbackContextValue = {
  toast: (message: string, type?: ToastType) => void;
  confirm: (message: string) => Promise<boolean>;
  requestReport: () => Promise<ReportResult | null>;
};

const UiFeedbackContext = createContext<UiFeedbackContextValue | null>(null);

const REPORT_REASONS = [
  "Спам",
  "Оскорбление",
  "Недопустимый контент",
  "Ложная информация",
  "Другое",
];

export function UiFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    message: string;
    resolve: (value: boolean) => void;
  } | null>(null);
  const [reportState, setReportState] = useState<{
    resolve: (value: ReportResult | null) => void;
  } | null>(null);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDescription, setReportDescription] = useState("");

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3800);
  }, []);

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ message, resolve });
    });
  }, []);

  const requestReport = useCallback(() => {
    return new Promise<ReportResult | null>((resolve) => {
      setReportReason(REPORT_REASONS[0]);
      setReportDescription("");
      setReportState({ resolve });
    });
  }, []);

  const value = useMemo(
    () => ({ toast, confirm, requestReport }),
    [toast, confirm, requestReport]
  );

  useEffect(() => {
    const nativeAlert = window.alert;
    window.alert = (message?: unknown) => {
      const text =
        typeof message === "string"
          ? message
          : message === null || message === undefined
          ? ""
          : String(message);
      toast(text || "Уведомление");
    };
    return () => {
      window.alert = nativeAlert;
    };
  }, [toast]);

  return (
    <UiFeedbackContext.Provider value={value}>
      {children}

      <div className="fixed bottom-4 right-4 z-[120] flex w-[340px] max-w-[calc(100vw-1rem)] flex-col gap-2">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`rounded-xl border bg-white px-3 py-2 shadow-md ${
              item.type === "error"
                ? "border-red-200"
                : item.type === "success"
                ? "border-green-200"
                : "border-umami-light-gray/60"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-inter text-sm text-umami-dark-gray">{item.message}</p>
              <button
                type="button"
                onClick={() =>
                  setToasts((prev) => prev.filter((toastItem) => toastItem.id !== item.id))
                }
                className="mt-0.5 shrink-0"
                aria-label="Закрыть"
              >
                <Image src="/X.svg" alt="close" width={14} height={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {confirmState ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[420px] rounded-2xl bg-white p-4">
            <p className="font-nunito text-lg font-bold text-umami-dark-gray">Подтверждение</p>
            <p className="mt-2 font-inter text-sm text-umami-gray">{confirmState.message}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  confirmState.resolve(true);
                  setConfirmState(null);
                }}
                className="flex-1 rounded-full bg-umami-orange px-3 py-1.5 font-nunito text-sm font-bold text-white"
              >
                Подтвердить
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmState.resolve(false);
                  setConfirmState(null);
                }}
                className="flex-1 rounded-full bg-[#ececec] px-3 py-1.5 font-nunito text-sm font-bold text-umami-dark-gray"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {reportState ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[480px] rounded-2xl bg-white p-4">
            <p className="font-nunito text-lg font-bold text-umami-dark-gray">Отправить жалобу</p>
            <label className="mt-3 block">
              <span className="mb-1 block font-inter text-sm text-umami-gray">Тип жалобы</span>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-full border border-umami-light-gray px-4 py-2 text-sm"
              >
                {REPORT_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block font-inter text-sm text-umami-gray">Сообщение</span>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-umami-light-gray px-3 py-2 text-sm"
                placeholder="Опишите проблему"
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  reportState.resolve({ reason: reportReason, description: reportDescription.trim() });
                  setReportState(null);
                }}
                className="flex-1 rounded-full bg-umami-orange px-3 py-1.5 font-nunito text-sm font-bold text-white"
              >
                Отправить
              </button>
              <button
                type="button"
                onClick={() => {
                  reportState.resolve(null);
                  setReportState(null);
                }}
                className="flex-1 rounded-full bg-[#ececec] px-3 py-1.5 font-nunito text-sm font-bold text-umami-dark-gray"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </UiFeedbackContext.Provider>
  );
}

export function useUiFeedback() {
  const context = useContext(UiFeedbackContext);
  if (!context) {
    throw new Error("useUiFeedback must be used within UiFeedbackProvider");
  }
  return context;
}
