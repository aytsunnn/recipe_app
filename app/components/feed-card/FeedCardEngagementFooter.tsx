"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode, RefObject } from "react";

interface FeedCardEngagementFooterProps {
  isLiked: boolean;
  likesCount: number;
  commentsCount: number;
  publishedAgo: string;
  exactPublishedAt: string;
  viewsCount?: number;
  metaInfoOpen: boolean;
  footerRightSlot?: ReactNode;
  metaInfoRef: RefObject<HTMLDivElement | null>;
  onLike: () => void;
  onCommentsClick: () => void;
  onToggleMetaInfo: () => void;
  commentsHref: string;
}

export default function FeedCardEngagementFooter({
  isLiked,
  likesCount,
  commentsCount,
  publishedAgo,
  exactPublishedAt,
  viewsCount,
  metaInfoOpen,
  footerRightSlot,
  metaInfoRef,
  onLike,
  onCommentsClick,
  onToggleMetaInfo,
  commentsHref,
}: FeedCardEngagementFooterProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-row gap-2">
        <div className="flex gap-1 items-center">
          <button onClick={onLike} className="cursor-pointer">
            <Image
              width={24}
              height={24}
              src={isLiked ? "/RedHeart.svg" : "/Heart.svg"}
              className="w-6 h-6"
              alt="like"
            />
          </button>
          <p className="font-inter text-sm text-umami-gray">{likesCount}</p>
        </div>
        <div className="flex gap-1 items-center">
          <Link href={commentsHref} onClick={onCommentsClick}>
            <Image
              width={24}
              height={24}
              src="/ChatCircle.svg"
              className="w-6 h-6"
              alt="comments"
            />
          </Link>
          <p className="font-inter text-sm text-umami-gray">{commentsCount}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {publishedAgo ? (
          <div ref={metaInfoRef} className="relative">
            <button
              type="button"
              onClick={onToggleMetaInfo}
              className="font-inter text-xs text-umami-light-gray hover:text-umami-dark-gray"
            >
              {publishedAgo}
            </button>
            {metaInfoOpen ? (
              <div className="absolute bottom-6 right-0 z-20 min-w-[180px] rounded-xl border border-umami-light-gray/60 bg-white p-2 shadow-md">
                <p className="font-inter text-xs text-umami-dark-gray">
                  {exactPublishedAt}
                </p>
                <p className="mt-1 font-inter text-xs text-umami-gray">
                  Просмотров: {viewsCount ?? 0}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
        {footerRightSlot}
      </div>
    </div>
  );
}
