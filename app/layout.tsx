import type { Metadata } from "next";
import { Inter, Nunito } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";

// Настройка шрифта Nunito
const nunito = Nunito({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

// Настройка шрифта Inter
const inter = Inter({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Умами',
  description: 'Кулинарный сервис',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${nunito.variable} ${inter.variable}`}>
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
