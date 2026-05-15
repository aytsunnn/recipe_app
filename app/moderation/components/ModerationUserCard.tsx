"use client";

import Image from "next/image";
import Link from "next/link";
import { ModerationUser } from "../../services/moderationService";

interface ModerationUserCardProps {
  user: ModerationUser;
  selected: boolean;
  onToggleSelect: () => void;
}

export default function ModerationUserCard({
  user,
  selected,
  onToggleSelect,
}: ModerationUserCardProps) {
  return (
    <div className="rounded-xl border border-umami-light-gray/50 bg-[#fffdfa] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-umami-dark-gray">
          Пользователь #{user.id}
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            user.is_blocked
              ? "bg-red-100 text-red-600"
              : "bg-green-100 text-green-600"
          }`}
        >
          {user.is_blocked ? "Заблокирован" : "Активен"}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <Link
          href={`/users/${user.id}`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-umami-light-gray/40 bg-white p-2 hover:bg-[#faf7ef]"
        >
          <Image
            width={40}
            height={40}
            src={user.avatar_url || "/avatar.jpg"}
            alt="user-avatar"
            className="h-10 w-10 rounded-full object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-umami-dark-gray">
              {user.name || "Без имени"}
            </p>
            <p className="truncate text-sm text-umami-gray">
              @{user.username || "unknown"}
            </p>
          </div>
        </Link>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-[#f3efe2] px-3 py-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="h-4 w-4 accent-umami-orange"
          />
          <span className="text-xs font-bold text-umami-dark-gray">Выбрать</span>
        </label>
      </div>

      <div className="mt-2">
        <span className="rounded-full bg-[#f3efe2] px-2 py-0.5 text-xs font-bold text-umami-dark-gray">
          Роль: {user.role || "User"}
        </span>
      </div>
    </div>
  );
}
