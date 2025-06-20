'use client';

import { useTheme } from '@/lib/theme-context';
import { useI18n } from '@/lib/i18n/useI18n';
import Icon from '@/components/Icon/Icon';

export default function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();
  const { t, isLoading } = useI18n();

  if (isLoading) return null;

  return (
    <div className="relative">
      <button
        onClick={toggleTheme}
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        aria-label={t ? t('theme.toggle') : 'Change theme'}
      >
        {theme === 'light' ? (
          <Icon name='sun' />
        ) : (
          <Icon name='moon' />
        )}
      </button>
    </div>
  );
} 