"use client";

import Image from "next/image";
import { FollowUser } from "../../services/followService";
import { normalizeImageUrl } from "../../utils/imageUrl";

interface FriendsSidebarProps {
  friends: FollowUser[];
  maxVisible?: number;
}

export default function FriendsSidebar({
  friends,
  maxVisible = 5,
}: FriendsSidebarProps) {
  const visibleFriends = friends.slice(0, maxVisible);

  return (
    <aside className="h-fit rounded-[15px] border border-[#eaeaea] bg-white p-2.5">
      <div className="mb-2 flex items-center justify-between font-inter text-base">
        <h2 className="text-[#222]">Друзья</h2>
        <span className="text-[#999]">{friends.length}</span>
      </div>
      {visibleFriends.length > 0 ? (
        <div className="flex flex-col gap-[5px]">
          {visibleFriends.map((friend) => (
            <div key={friend.id} className="flex items-center gap-[5px]">
              <div className="relative h-[30px] w-[30px] shrink-0 overflow-hidden rounded-full bg-[#d9d9d9]">
                <Image
                  width={30}
                  height={30}
                  src={normalizeImageUrl(friend.avatar_url, "/avatar.jpg")}
                  alt="avatar"
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="truncate font-inter text-sm text-umami-dark-gray">
                {friend.name}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-4 text-center font-inter text-sm text-umami-gray">
          Пока нет друзей
        </p>
      )}
    </aside>
  );
}
