import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "日本人学習者のための英語発音学習支援システム",
  description: "日本人学習者向けの英語発音学習支援システムです。",
};

export default function RootLayout({
  children,}: Readonly<{children: React.ReactNode}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header>
          <a href="/">ELPS-J</a>

          <nav>
            <a href="/">ホーム</a>
            <a href="/segmental">分節音</a>
            <a href="/AssociativePhase">発音練習</a>
          </nav>
        </header>

        {children}
      </body>
    </html>
  )
}
