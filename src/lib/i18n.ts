import en from "@/locales/en.json";
import es from "@/locales/es.json";

export type Translations = typeof en;

export function getTranslations(locale: string | undefined | null) {
  const dict = locale === "es" ? es : en;

  return (key: string): string => {
    const parts = key.split(".");
    let current: any = dict;

    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        // Fallback to searching the other dictionary in case of missing keys
        const fallbackDict = locale === "es" ? en : es;
        let fallbackCurrent: any = fallbackDict;
        for (const fbPart of parts) {
          if (fallbackCurrent && typeof fallbackCurrent === "object" && fbPart in fallbackCurrent) {
            fallbackCurrent = fallbackCurrent[fbPart];
          } else {
            fallbackCurrent = null;
            break;
          }
        }
        if (typeof fallbackCurrent === "string") {
          return fallbackCurrent;
        }
        return key;
      }
    }

    return typeof current === "string" ? current : key;
  };
}
