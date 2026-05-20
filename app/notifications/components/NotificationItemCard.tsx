"use client";

import Image from "next/image";
import Link from "next/link";
import { AppNotification } from "../../services/notificationService";

interface NotificationItemCardProps {
  item: AppNotification;
  formattedDate: string;
  onOpen: () => void;
}

export default function NotificationItemCard({
  item,
  formattedDate,
  onOpen,
}: NotificationItemCardProps) {
  return (
    <div
      className={`rounded-2xl border p-3 shadow-sm transition-colors sm:p-4 ${
        item.is_read
          ? "border-umami-light-gray/40 bg-white hover:bg-[#fffcf7]"
          : "border-umami-orange/55 bg-[#fff3e2] hover:bg-[#fff0db]"
      } ${!item.isSystem && item.targetLink ? "cursor-pointer" : ""}`}
      onClick={onOpen}
    >
      {!item.isSystem && (item.actorName || item.actorUsername) ? (
        <div className="flex items-start gap-3">
          {item.actorId ? (
            <Link
              href={`/users/${item.actorId}`}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0"
            >
              <Image
                width={40}
                height={40}
                src={item.actorAvatarUrl || "/avatar.jpg"}
                alt="actor-avatar"
                className="h-9 w-9 rounded-full border border-umami-light-gray/40 object-cover sm:h-10 sm:w-10"
              />
            </Link>
          ) : (
            <Image
              width={40}
              height={40}
              src={item.actorAvatarUrl || "/avatar.jpg"}
              alt="actor-avatar"
              className="h-10 w-10 rounded-full border border-umami-light-gray/40 object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                {item.actorId ? (
                  <Link
                    href={`/users/${item.actorId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="truncate font-nunito text-xs font-extrabold text-umami-dark-gray hover:underline sm:text-sm"
                  >
                    {item.actorName || "Пользователь"}
                  </Link>
                ) : (
                  <p className="truncate font-nunito text-sm font-extrabold text-umami-dark-gray">
                    {item.actorName || "Пользователь"}
                  </p>
                )}
              </div>
              {!item.is_read ? (
                <span className="rounded-full bg-umami-orange px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
                  Новое
                </span>
              ) : null}
            </div>
            <p className="mt-2 whitespace-pre-wrap font-inter text-xs text-umami-dark-gray sm:text-sm">
              {item.message || item.title}
            </p>
            <p className="mt-1 text-xs text-umami-light-gray">{formattedDate}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5efe0]">
            <Image width={18} height={18} src="/Colocolchik.svg" alt="system" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="font-nunito text-xs font-extrabold text-umami-dark-gray sm:text-sm">
                Системное уведомление
              </p>
              {!item.is_read ? (
                <span className="rounded-full bg-umami-orange px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
                  Новое
                </span>
              ) : null}
            </div>
            <p className="mt-2 whitespace-pre-wrap font-inter text-xs text-umami-dark-gray sm:text-sm">
              {item.message || item.title}
            </p>
            <p className="mt-1 text-xs text-umami-light-gray">{formattedDate}</p>
          </div>
        </div>
      )}
    </div>
  );
}
