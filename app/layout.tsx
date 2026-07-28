import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import ThemeToggle from "./ThemeToggle";
import "./globals.css";

const themeInitializationScript = `
  (function () {
    try {
      var savedTheme = localStorage.getItem('elps-j:theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        document.documentElement.dataset.theme = savedTheme;
      }
    } catch (error) {
      document.documentElement.dataset.theme = 'light';
    }
  })();
`;

export const metadata: Metadata = {
  title: "日本人学習者のための英語発音学習支援システム",
  description: "日本人学習者向けの英語発音学習支援システムです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-950">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <Link
              href="/"
              className="flex items-baseline gap-3 font-bold tracking-tight text-slate-950"
            >
              <span lang="en" className="text-xl text-blue-700">
                ELPS-J
              </span>
              <span
                lang="en"
                className="hidden text-xs font-medium text-slate-500 lg:inline"
              >
                English Pronunciation Learning System
              </span>
            </Link>

            <div className="flex flex-wrap items-center gap-4 sm:justify-end">
              <nav
                aria-label="主要ナビゲーション"
                className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-600"
              >
                <Link className="transition hover:text-blue-700" href="/">
                  ホーム
                </Link>
                <Link className="transition hover:text-blue-700" href="/learn">
                  <span lang="en">STEP 1</span> 発音知識学習
                </Link>
                <Link
                  className="transition hover:text-blue-700"
                  href="/components"
                >
                  <span lang="en">STEP 2</span> 発音構成理解
                </Link>
                <Link
                  className="transition hover:text-blue-700"
                  href="/practice"
                >
                  <span lang="en">STEP 3</span> 発音練習
                </Link>
              </nav>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {children}

        <footer className="mt-auto border-t border-slate-200 bg-white">
          <div className="mx-auto w-full max-w-6xl px-5 py-6 text-sm text-slate-500 sm:px-8">
            <span lang="en">ELPS-J</span> —
            日本人学習者のための英語発音学習支援システム
          </div>
        </footer>
        <Script
          id="initialize-color-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitializationScript }}
        />
      </body>
    </html>
  );
}
