"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import NotFoundVideo from "./components/NotFoundVideo";

export default function NotFoundPage() {
  const [isVideoStarted, setIsVideoStarted] = useState(false);
  const handleVideoStarted = useCallback(() => {
    setIsVideoStarted(true);
  }, []);

  return (
    <main className="flex min-h-[80vh] w-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-[720px] rounded-[20px] border border-umami-light-gray/50 bg-white p-5">
        <div className="overflow-hidden rounded-[16px] border border-umami-light-gray/50">
          <NotFoundVideo onStarted={handleVideoStarted} />
        </div>

        <div className="mt-4 text-center">
          <h1 className="font-nunito text-2xl font-bold text-umami-dark-gray">Ошибка 404</h1>
          <p className="mt-2 font-inter text-sm text-umami-gray">
            Страница не найдена или была перемещена.
          </p>
          {isVideoStarted ? (
            <Link
              href="/"
              className="mt-4 inline-flex rounded-full bg-umami-orange px-4 py-2 font-nunito text-sm text-white"
            >
              Вернуться на главную
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
