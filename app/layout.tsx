import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";

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
        <main className="h-min-screen w-full justify-center flex">
          <div className="w-299 pt-12.5 gap-12.5 flex flex-col">
            <Header />
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
