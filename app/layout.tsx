import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";
import { UiFeedbackProvider } from "./components/UiFeedbackProvider";

export const metadata: Metadata = {
  title: "Умами",
  description: "Кулинарный сервис",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="font-sans">
        <UiFeedbackProvider>
          <div className="fixed inset-x-0 top-0 z-50 bg-umami-light-yellow">
            <div className="mx-auto w-299 pt-12.5 pb-3">
              <Header />
            </div>
          </div>
          <main className="min-h-screen w-full justify-center flex">
            <div className="w-299 gap-8 flex flex-col pb-8 pt-[150px]">
              {children}
            </div>
          </main>
        </UiFeedbackProvider>
      </body>
    </html>
  );
}
