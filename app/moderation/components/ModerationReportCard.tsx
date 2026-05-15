"use client";

import Image from "next/image";
import Link from "next/link";
import { ModerationReport } from "../../services/moderationService";

interface ModerationReportCardProps {
  report: ModerationReport;
  actionLoading: string | null;
  resolvedAction: "accept" | "block-user" | undefined;
  typeLabel: string;
  statusLabel: string;
  reporterLabel: string;
  targetLabel: string;
  targetHref: string | null;
  unavailableTargetMessage: string | null;
  createdAtLabel: string;
  updatedAtLabel: string;
  showUpdatedAt: boolean;
  isUserTarget: boolean;
  commentActionLabel: string;
  onSetReviewed: () => void;
  onAccept: () => void;
  onBlockUser: () => void;
  onDismiss: () => void;
}

export default function ModerationReportCard({
  report,
  actionLoading,
  resolvedAction,
  typeLabel,
  statusLabel,
  reporterLabel,
  targetLabel,
  targetHref,
  unavailableTargetMessage,
  createdAtLabel,
  updatedAtLabel,
  showUpdatedAt,
  isUserTarget,
  commentActionLabel,
  onSetReviewed,
  onAccept,
  onBlockUser,
  onDismiss,
}: ModerationReportCardProps) {
  return (
    <div className="rounded-xl border border-umami-light-gray/50 bg-[#fffdfa] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-umami-dark-gray">Жалоба #{report.id}</p>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#f3efe2] px-2 py-0.5 text-xs font-bold text-umami-dark-gray">
            {typeLabel}
          </span>
          <span className="rounded-full bg-[#eaf2e6] px-2 py-0.5 text-xs font-bold text-umami-dark-gray">
            {statusLabel}
          </span>
        </div>
      </div>

      {report.Reporter?.id || report.reporter_user_id ? (
        <Link
          href={`/users/${report.Reporter?.id || report.reporter_user_id}`}
          className="mt-3 flex items-center gap-3 rounded-lg border border-umami-light-gray/40 bg-white p-2 hover:bg-[#faf7ef]"
        >
          <Image
            width={40}
            height={40}
            src={"/avatar.jpg"}
            alt="reporter-avatar"
            className="h-10 w-10 rounded-full object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-umami-dark-gray">
              @{report.Reporter?.username || "unknown"}
            </p>
            <p className="truncate text-sm text-umami-gray">
              {report.Reporter?.name || reporterLabel}
            </p>
          </div>
        </Link>
      ) : (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-umami-light-gray/40 bg-white p-2">
          <Image
            width={40}
            height={40}
            src={"/avatar.jpg"}
            alt="reporter-avatar"
            className="h-10 w-10 rounded-full object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-umami-dark-gray">
              @{report.Reporter?.username || "unknown"}
            </p>
            <p className="truncate text-sm text-umami-gray">
              {report.Reporter?.name || reporterLabel}
            </p>
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={actionLoading === `report-${report.id}`}
          onClick={onSetReviewed}
          className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
            (report.status || "").toLowerCase() === "reviewed"
              ? "bg-umami-orange text-white ring-2 ring-umami-orange/35"
              : "bg-gray-100 text-umami-dark-gray hover:bg-gray-200"
          }`}
        >
          В работе
        </button>

        {isUserTarget ? (
          <button
            type="button"
            disabled={actionLoading === `report-${report.id}-block`}
            onClick={onBlockUser}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-colors disabled:opacity-60 ${
              (report.status || "").toLowerCase() === "resolved" &&
              resolvedAction === "block-user"
                ? "bg-umami-orange text-white ring-2 ring-umami-orange/35"
                : "bg-gray-100 text-umami-dark-gray hover:bg-gray-200"
            }`}
          >
            Заблокировать пользователя
          </button>
        ) : (
          <button
            type="button"
            disabled={actionLoading === `report-${report.id}-accept`}
            onClick={onAccept}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-colors disabled:opacity-60 ${
              (report.status || "").toLowerCase() === "resolved"
                ? "bg-umami-orange text-white ring-2 ring-umami-orange/35"
                : "bg-gray-100 text-umami-dark-gray hover:bg-gray-200"
            }`}
          >
            {commentActionLabel}
          </button>
        )}

        <button
          type="button"
          disabled={actionLoading === `report-${report.id}-dismiss`}
          onClick={onDismiss}
          className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
            (report.status || "").toLowerCase() === "dismissed"
              ? "bg-red-500 text-white ring-2 ring-red-300"
              : "bg-gray-100 text-umami-dark-gray hover:bg-gray-200"
          }`}
        >
          Отказать
        </button>
      </div>

      <p className="mt-3 text-xs text-umami-light-gray">Причина</p>
      <p className="text-sm font-semibold text-umami-dark-gray">
        {report.reason || "Без причины"}
      </p>

      {report.description ? (
        <>
          <p className="mt-2 text-xs text-umami-light-gray">Описание</p>
          <p className="whitespace-pre-wrap text-sm text-umami-dark-gray">
            {report.description}
          </p>
        </>
      ) : null}

      <p className="mt-2 text-xs text-umami-light-gray">Объект жалобы</p>
      {unavailableTargetMessage ? (
        <p className="text-sm font-semibold text-red-500">{unavailableTargetMessage}</p>
      ) : targetHref ? (
        <Link href={targetHref} className="text-sm font-semibold text-umami-orange hover:underline">
          {targetLabel}
        </Link>
      ) : (
        <p className="text-sm font-semibold text-umami-dark-gray">{targetLabel}</p>
      )}

      <div className="mt-2 flex items-center justify-between gap-3 text-sm text-umami-gray">
        <p>Создано: {createdAtLabel}</p>
        {showUpdatedAt ? (
          <p className="text-right">Обновлено: {updatedAtLabel}</p>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
