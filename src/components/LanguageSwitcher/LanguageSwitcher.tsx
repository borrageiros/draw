'use client';

import { useLanguage } from '@/lib/i18n/language-context';
import { locales } from '@/lib/i18n/i18n-config';
import { useI18n } from '@/lib/i18n/useI18n';

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  const { isLoading } = useI18n();

  if (isLoading) return null;

  const toggleLanguage = () => {
    const currentIndex = locales.indexOf(locale);
    const nextIndex = (currentIndex + 1) % locales.length;
    setLocale(locales[nextIndex]);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleLanguage}
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
      >
        <span className="uppercase border border-gray-400 px-2 py-1 rounded">{locale}</span>
      </button>
    </div>
  );
} 