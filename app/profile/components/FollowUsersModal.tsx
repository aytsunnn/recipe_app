"use client";

import Image from "next/image";
import Link from "next/link";
import { FollowUser } from "../../services/followService";
import { normalizeImageUrl } from "../../utils/imageUrl";

interface FollowUsersModalProps {
  type: "following" | "followers" | null;
  users: FollowUser[];
  loading: boolean;
  onClose: () => void;
}

export default function FollowUsersModal({
  type,
  users,
  loading,
  onClose,
}: FollowUsersModalProps) {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-[520px] rounded-[20px] bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-nunito text-xl font-bold text-umami-dark-gray">
            {type === "following" ? "Подписки" : "Подписчики"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-umami-gray px-3 py-1 font-nunito text-xs text-white"
          >
            Закрыть
          </button>
        </div>
        {loading ? (
          <p className="py-4 text-sm text-umami-gray">Загрузка...</p>
        ) : users.length === 0 ? (
          <p className="py-4 text-sm text-umami-gray">Список пуст</p>
        ) : (
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {users.map((person) => (
              <Link
                key={person.id}
                href={`/users/${person.id}`}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl border border-umami-light-gray/50 p-2 hover:bg-[#faf7ef]"
              >
                <Image
                  width={40}
                  height={40}
                  src={normalizeImageUrl(person.avatar_url, "/avatar.jpg")}
                  alt={person.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate font-nunito text-sm font-bold text-umami-dark-gray">
                    {person.name}
                  </p>
                  <p className="truncate font-inter text-xs text-umami-gray">
                    @{person.username}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
