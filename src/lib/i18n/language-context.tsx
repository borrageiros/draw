'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { locales, defaultLocale } from './i18n-config';

type LanguageContextType = {
  locale: string;
  setLocale: (locale: string) => void;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<string>(defaultLocale);

  useEffect(() => {
    const storedLocale = localStorage.getItem('locale');
    
    if (storedLocale && locales.includes(storedLocale)) {
      setLocale(storedLocale);
    } else {
      const browserLocale = navigator.language.split('-')[0];
      const newLocale = locales.includes(browserLocale) ? browserLocale : defaultLocale;
      setLocale(newLocale);
      localStorage.setItem('locale', newLocale);
    }
  }, []);

  const handleSetLocale = (newLocale: string) => {
    if (locales.includes(newLocale)) {
      setLocale(newLocale);
      localStorage.setItem('locale', newLocale);
    }
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale: handleSetLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
} 