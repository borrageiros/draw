'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/useI18n';
import { login } from '@/lib/api';
import LanguageSwitcher from '@/components/LanguageSwitcher/LanguageSwitcher';
import ThemeSwitcher from '@/components/ThemeSwitcher/ThemeSwitcher';

export default function Login() {
  const router = useRouter();
  const { t, isLoading } = useI18n();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      if (name === 'remember-me') {
        setRememberMe(checked);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const result = await login({
        email: formData.email,
        password: formData.password,
        rememberMe: rememberMe
      });

      if (result.error) {
        throw new Error(result.error || t('auth.errors.loginError'));
      }

      if (result.data?.token) {
        localStorage.setItem('token', result.data.token);
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('auth.errors.unknownError') || '');
      }
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
          <div className="px-8 pt-8 pb-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-normal text-gray-800 dark:text-white mb-2">{t('auth.login.title')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('auth.login.subtitle')}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <ThemeSwitcher />
              <LanguageSwitcher />
            </div>
          </div>
          
          <div className="px-8 py-6">
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400 rounded-md">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('auth.login.emailOrUsername')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="username email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 dark:focus:ring-gray-500 dark:focus:border-gray-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={t('auth.login.emailOrUsernamePlaceholder')}
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('auth.login.password')}
                  </label>
                  {/* <div className="text-xs">
                    <a href="#" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                      {t('auth.login.forgotPassword')}
                    </a>
                  </div> */}
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 dark:focus:ring-gray-500 dark:focus:border-gray-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="••••••••"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-0 border-gray-300 dark:border-gray-600 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600 dark:text-gray-400">
                  {t('auth.login.rememberMe')}
                </label>
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('auth.login.buttonLoading')}
                    </>
                  ) : t('auth.login.button')}
                </button>
              </div>
            </form>
          </div>
          
          <div className="px-8 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <p className="text-sm text-center text-gray-600 dark:text-gray-400">
              {t('auth.login.noAccount')}{' '}
              <Link href="/auth/register" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                {t('auth.login.signUp')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
