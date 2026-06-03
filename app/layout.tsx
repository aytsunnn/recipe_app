import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";
import { UiFeedbackProvider } from "./components/UiFeedbackProvider";
import BlockedUserGuard from "./components/BlockedUserGuard";

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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var iframe = document.createElement('iframe');
                  iframe.style.display = 'none';
                  document.documentElement.appendChild(iframe);
                  var nativeGet = iframe.contentWindow.Object.getOwnPropertyDescriptor;
                  document.documentElement.removeChild(iframe);
                  if (nativeGet) {
                    try {
                      Object.defineProperty(Object, 'getOwnPropertyDescriptor', {
                        value: nativeGet,
                        writable: false,
                        configurable: false
                      });
                      console.log("Locked Object.getOwnPropertyDescriptor to native.");
                    } catch (err) {
                      // Fallback if already defined as non-configurable
                      Object.getOwnPropertyDescriptor = nativeGet;
                    }
                  }
                } catch (e) {}
              })();
            `
          }}
        />
        <UiFeedbackProvider>
          <BlockedUserGuard>
            <div className="fixed inset-x-0 top-0 z-50 bg-umami-light-yellow">
              <div className="mx-auto w-full max-w-[1196px] px-3 pb-3 pt-4 md:px-4 md:pt-6 lg:w-299 lg:max-w-none lg:px-0 lg:pb-3 lg:pt-12.5">
                <Header />
              </div>
            </div>
            <main className="min-h-screen w-full justify-center flex">
              <div className="flex w-full max-w-[1196px] flex-col gap-4 px-3 pb-8 pt-[124px] md:gap-6 md:px-4 md:pt-[132px] lg:w-299 lg:max-w-none lg:gap-8 lg:px-0 lg:pt-[150px]">
                {children}
              </div>
            </main>
          </BlockedUserGuard>
        </UiFeedbackProvider>
      </body>
    </html>
  );
}
