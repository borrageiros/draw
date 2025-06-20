"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "./language-context";
import { getTranslation } from "./i18n";

export function useI18n() {
  const { locale } = useLanguage();
  const [t, setT] = useState<(key: string) => string | undefined>(null!);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadTranslations = async () => {
      setIsLoading(true);
      try {
        const translation = await getTranslation(locale);
        if (isMounted) {
          setT(() => translation.t);
        }
      } catch (error) {
        console.error("Error loading translations:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTranslations();

    return () => {
      isMounted = false;
    };
  }, [locale]);

  return { t, isLoading, locale };
}
