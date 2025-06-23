'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/language-context";
import { ThemeProvider } from "@/lib/theme-context";
import { useEffect, useState } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [language, setLanguage] = useState<string>('es');

  useEffect(() => {
    const storedLanguage = localStorage.getItem('locale');
    if (storedLanguage) {
      setLanguage(storedLanguage);
    } else {
      const browserLang = navigator.language.split('-')[0];
      setLanguage(['es', 'en'].includes(browserLang) ? browserLang : 'en');
    }
  }, []);

  return (
    <html lang={language}>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
