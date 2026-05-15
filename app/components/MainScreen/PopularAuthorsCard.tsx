"use client";

import Image from "next/image";
import Link from "next/link";

export interface PopularAuthorCardItem {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  recipesCount: number;
  likesCount: number;
}

interface PopularAuthorsCardProps {
  isLoading: boolean;
  authors: PopularAuthorCardItem[];
  currentUserId?: string;
  isAuthenticated: boolean;
  followingIds: Set<string>;
  getSafeImageUrl: (url: string | null) => string;
  onToggleFollow: (authorId: string) => void;
}

export default function PopularAuthorsCard({
  isLoading,
  authors,
  currentUserId,
  isAuthenticated,
  followingIds,
  getSafeImageUrl,
  onToggleFollow,
}: PopularAuthorsCardProps) {
  return (
    <div className="rounded-[15px] border border-[#eaeaea] bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-nunito text-base font-bold text-umami-dark-gray">
          Популярные авторы
        </p>
      </div>

      {isLoading ? (
        <p className="py-3 text-sm text-umami-gray">Загрузка...</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {authors.map((author) => {
            const isOwn = currentUserId === author.id;
            const isFollowing = followingIds.has(author.id);
            return (
              <Link
                key={author.id}
                href={`/users/${author.id}`}
                className="rounded-[10px] border border-[#ececec] p-2.5 transition-colors hover:bg-[#fcfaf5]"
              >
                <div className="flex items-center gap-2">
                  <Image
                    src={getSafeImageUrl(author.avatar_url)}
                    width={36}
                    height={36}
                    alt={author.name}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-nunito text-sm font-bold text-umami-dark-gray">
                      {author.name}
                    </p>
                    <p className="truncate font-inter text-xs text-umami-gray">
                      @{author.username}
                    </p>
                  </div>
                </div>
                <p className="mt-2 font-inter text-xs text-umami-gray">
                  {author.recipesCount} рецептов • {author.likesCount} лайков
                </p>
                {isAuthenticated && !isOwn && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      onToggleFollow(author.id);
                    }}
                    className={`mt-2 w-full rounded-full px-3 py-1.5 font-nunito text-xs font-bold ${
                      isFollowing
                        ? "bg-[#f1ebdb] text-umami-dark-gray"
                        : "bg-umami-green text-white"
                    }`}
                  >
                    {isFollowing ? "Вы подписаны" : "Подписаться"}
                  </button>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
