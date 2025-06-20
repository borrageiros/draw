import { createInstance, i18n } from "i18next";
import { initReactI18next } from "react-i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import { getOptions } from "./i18n-config";

// Caché para las instancias de i18next por idioma y namespace
const i18nInstancesCache: Record<string, i18n> = {};

const initI18next = async (lng: string, ns: string) => {
  const cacheKey = `${lng}:${ns}`;

  // Si ya existe en caché, devolver la instancia existente
  if (i18nInstancesCache[cacheKey]) {
    return i18nInstancesCache[cacheKey];
  }

  const i18nInstance = createInstance();
  await i18nInstance
    .use(initReactI18next)
    .use(
      resourcesToBackend(
        (language: string, namespace: string) =>
          import(`../../../public/locales/${language}/${namespace}.json`)
      )
    )
    .init(getOptions(lng, ns));

  // Guardar en caché
  i18nInstancesCache[cacheKey] = i18nInstance;

  return i18nInstance;
};

// Tipo para la función de traducción
export type TranslationFunction = (key: string) => string | undefined;

// Tipo para el objeto de traducción cacheado
interface CachedTranslation {
  t: TranslationFunction;
  i18n: i18n;
}

// Caché para las funciones de traducción
const translationCache: Record<string, CachedTranslation> = {};

export async function getTranslation(
  lng: string,
  ns: string = "common"
): Promise<CachedTranslation> {
  const cacheKey = `${lng}:${ns}`;

  // Si ya existe en caché, devolver la función de traducción existente
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }

  const i18nextInstance = await initI18next(lng, ns);
  const translation: CachedTranslation = {
    t: i18nextInstance.getFixedT(lng, ns),
    i18n: i18nextInstance,
  };

  // Guardar en caché
  translationCache[cacheKey] = translation;

  return translation;
}
