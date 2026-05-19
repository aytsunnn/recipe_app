"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ModerationUser } from "../../services/moderationService";
import { normalizeImageUrl } from "../../utils/imageUrl";

interface ModerationUserCardProps {
  user: ModerationUser;
  isAdmin: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  onDelete: () => void;
  onUpdateRole: (role: "Admin" | "Moderator" | "User") => void;
  onEdit: () => void;
  actionLoading?: string | null;
}

export default function ModerationUserCard({
  user,
  isAdmin,
  selected,
  onToggleSelect,
  onBlock,
  onUnblock,
  onDelete,
  onUpdateRole,
  onEdit,
  actionLoading,
}: ModerationUserCardProps) {
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  const normalizedRole = (user.role || "User").toLowerCase();
  const currentRole: "Admin" | "Moderator" | "User" = normalizedRole.includes(
    "admin"
  )
    ? "Admin"
    : normalizedRole.includes("moderator")
    ? "Moderator"
    : "User";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (roleMenuRef.current && !roleMenuRef.current.contains(target)) {
        setIsRoleMenuOpen(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(target)) {
        setIsActionsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="rounded-xl border border-umami-light-gray/50 bg-[#fffdfa] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="h-4 w-4 accent-umami-orange"
            aria-label={`Выбрать пользователя ${user.id}`}
          />
          <p className="text-sm font-bold text-umami-dark-gray">
            Пользователь #{user.id}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" ref={roleMenuRef}>
            <button
              type="button"
              disabled={!isAdmin || actionLoading === `user-${user.id}-role`}
              onClick={() => {
                if (!isAdmin) return;
                setIsRoleMenuOpen((prev) => !prev);
              }}
              className={`rounded-full bg-[#f3efe2] px-2 py-0.5 text-xs font-bold text-umami-dark-gray ${
                isAdmin ? "hover:bg-[#ece4cf]" : "cursor-default"
              }`}
            >
              Роль: {user.role || "User"}
            </button>

            {isAdmin && isRoleMenuOpen ? (
              <div className="absolute right-0 top-7 z-20 min-w-[150px] rounded-xl border border-umami-light-gray/50 bg-white p-1 shadow-lg">
                {(["User", "Moderator", "Admin"] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      onUpdateRole(role);
                      setIsRoleMenuOpen(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      currentRole === role
                        ? "bg-[#f8f4ea] font-bold text-umami-dark-gray"
                        : "text-umami-dark-gray hover:bg-[#f8f4ea]"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

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
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-umami-light-gray/40 bg-white p-2">
        <Link
          href={`/users/${user.id}`}
          className="flex min-w-0 flex-1 items-center gap-3 hover:bg-[#faf7ef] rounded-lg p-1"
        >
          <Image
            width={40}
            height={40}
            src={normalizeImageUrl(user.avatar_url, "/avatar.jpg")}
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

        {isAdmin ? (
          <div className="relative" ref={actionsMenuRef}>
            <button
              type="button"
              onClick={() => setIsActionsMenuOpen((prev) => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-umami-light-gray/50 bg-white hover:bg-[#faf7ef]"
              aria-label="Действия с пользователем"
            >
              <Image
                width={18}
                height={18}
                src="/DotsThreeOutlineVertical.svg"
                alt="actions"
              />
            </button>

            {isActionsMenuOpen ? (
              <div className="absolute right-0 top-9 z-20 min-w-[170px] rounded-xl border border-umami-light-gray/50 bg-white p-1 shadow-lg">
                <button
                  type="button"
                  disabled={actionLoading === `user-${user.id}-edit`}
                  onClick={() => {
                    onEdit();
                    setIsActionsMenuOpen(false);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-umami-dark-gray hover:bg-[#f8f4ea] disabled:opacity-60"
                >
                  Редактировать
                </button>
                {user.is_blocked ? (
                  <button
                    type="button"
                    disabled={actionLoading === `user-${user.id}-unblock`}
                    onClick={() => {
                      onUnblock();
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-umami-dark-gray hover:bg-[#f8f4ea] disabled:opacity-60"
                  >
                    Разблокировать
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionLoading === `user-${user.id}-block`}
                    onClick={() => {
                      onBlock();
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-umami-dark-gray hover:bg-[#f8f4ea] disabled:opacity-60"
                  >
                    Заблокировать
                  </button>
                )}
                <button
                  type="button"
                  disabled={actionLoading === `user-${user.id}-delete`}
                  onClick={() => {
                    onDelete();
                    setIsActionsMenuOpen(false);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  Удалить
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-1" />
    </div>
  );
}
