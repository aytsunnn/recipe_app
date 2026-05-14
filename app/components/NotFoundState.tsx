"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import NotFoundVideo from "./NotFoundVideo";

interface NotFoundStateProps {
  title?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}

export default function NotFoundState({
  title = "Ошибка 404",
  description = "Страница не найдена или была перемещена.",
  actionHref = "/",
  actionLabel = "Вернуться на главную",
}: NotFoundStateProps) {
  const [isVideoStarted, setIsVideoStarted] = useState(false);
  const handleVideoStarted = useCallback(() => {
    setIsVideoStarted(true);
  }, []);

  return (
    <div className="w-full rounded-[20px] border border-umami-light-gray/50 bg-white p-5">
      <div className="overflow-hidden rounded-[16px] border border-umami-light-gray/50">
        <NotFoundVideo onStarted={handleVideoStarted} />
      </div>

      <div className="mt-4 text-center">
        <h1 className="font-nunito text-2xl font-bold text-umami-dark-gray">{title}</h1>
        <p className="mt-2 font-inter text-sm text-umami-gray">{description}</p>
        {isVideoStarted ? (
          <Link
            href={actionHref}
            className="mt-4 inline-flex rounded-full bg-umami-orange px-4 py-2 font-nunito text-sm text-white"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

