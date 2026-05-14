"use client";

import NotFoundState from "./components/NotFoundState";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-[80vh] w-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-[720px]">
        <NotFoundState />
      </div>
    </main>
  );
}
