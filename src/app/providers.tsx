'use client';

import { useEffect } from "react";
import { LanguageProvider } from "@/lib/i18n/language-context";
import { ThemeProvider } from "@/lib/theme-context";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const storedLanguage = localStorage.getItem('locale');
    if (storedLanguage) {
      document.documentElement.lang = storedLanguage;
    } else {
      const browserLang = navigator.language.split('-')[0];
      const lang = ['es', 'en'].includes(browserLang) ? browserLang : 'en';
      document.documentElement.lang = lang;
    }
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </ThemeProvider>
  );
} 