"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const PRIMARY_VIDEO_SRC = "https://umami-recipes.ru/storage/vkusno/404/404.mp4";
const FALLBACK_VIDEO_SRC = "/storage/vkusno/404/404.mp4";

type NotFoundVideoProps = {
  onStarted?: () => void;
};

export default function NotFoundVideo({ onStarted }: NotFoundVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pathname = usePathname();
  const [needsUserAction, setNeedsUserAction] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const cacheBust = `t=${Date.now()}`;
    video.src = `${PRIMARY_VIDEO_SRC}?${cacheBust}`;
    video.currentTime = 0;
    video.load();

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise
        .then(() => {
          setNeedsUserAction(false);
          onStarted?.();
        })
        .catch(() => {
          setNeedsUserAction(true);
        });
    }
  }, [pathname, onStarted]);

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className="h-auto w-full"
        autoPlay
        loop
        playsInline
        onPlaying={() => onStarted?.()}
        onError={() => {
          const video = videoRef.current;
          if (!video) {
            return;
          }
          const cacheBust = `t=${Date.now()}`;
          video.src = `${FALLBACK_VIDEO_SRC}?${cacheBust}`;
          video.load();
          video.play().catch(() => {
            setNeedsUserAction(true);
          });
        }}
      />

      {needsUserAction ? (
        <button
          type="button"
          onClick={() => {
            const video = videoRef.current;
            if (!video) {
              return;
            }
            video
              .play()
              .then(() => {
                setNeedsUserAction(false);
                onStarted?.();
              })
              .catch(() => {});
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/45 px-4 text-center font-nunito text-lg font-bold text-white"
        >
          Нажмите, чтобы воспроизвести видео
        </button>
      ) : null}
    </div>
  );
}
