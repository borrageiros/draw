export const defaultLocale = "en";
export const locales = ["en", "es"];

export function getOptions(lng = defaultLocale, ns = "common") {
  return {
    supportedLngs: locales,
    fallbackLng: defaultLocale,
    lng,
    ns,
    defaultNS: "common",
    fallbackNS: "common",
  };
}
