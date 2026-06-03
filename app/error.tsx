'use client';

import { useEffect } from 'react';
import Image from 'next/image';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Captured client-side error:', error);
  }, [error]);

  return (
    <div className="mx-auto my-10 flex w-full max-w-[600px] flex-col items-center justify-center rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-10 h-10"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <h2 className="font-nunito text-2xl font-extrabold text-umami-dark-gray mb-2">
        Что-то пошло не так
      </h2>
      <p className="font-inter text-sm text-umami-gray mb-6">
        Произошла ошибка при отрисовке интерфейса. Пожалуйста, отправьте скриншот этой страницы разработчику.
      </p>
      
      <div className="w-full text-left bg-red-50/50 border border-red-100 p-4 rounded-2xl text-xs text-red-700 overflow-x-auto mb-6 font-mono whitespace-pre-wrap max-h-[300px]">
        <strong>Сообщение:</strong> {error.message || 'Неизвестная ошибка'}
        {error.stack && (
          <div className="mt-2 pt-2 border-t border-red-200/50">
            <strong>Стек вызовов:</strong>
            <pre className="mt-1 font-mono text-[10px] leading-relaxed">{error.stack}</pre>
          </div>
        )}
      </div>

      <div className="flex gap-3 w-full">
        <button
          onClick={() => reset()}
          className="flex-1 h-11 rounded-full bg-umami-orange font-nunito font-bold text-white shadow-md hover:bg-umami-orange/95 transition-colors"
        >
          Попробовать снова
        </button>
        <a
          href="/"
          className="flex-1 h-11 rounded-full border border-umami-light-gray bg-white font-nunito font-bold text-umami-dark-gray hover:bg-umami-light-yellow/30 transition-colors flex items-center justify-center text-sm"
        >
          На главную
        </a>
      </div>
    </div>
  );
}
