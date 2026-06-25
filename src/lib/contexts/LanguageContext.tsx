"use client";

import { createContext, useContext, useState, useTransition, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getTranslations } from "@/lib/i18n";

type LanguageContextType = {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({
  children,
  initialLanguage,
}: {
  children: ReactNode;
  initialLanguage: string;
}) {
  const [language, setLanguageState] = useState(initialLanguage);
  const router = useRouter();
  const [, startTransition] = useTransition();

  const setLanguage = (lang: string) => {
    // Save to cookie (lasts 1 year)
    document.cookie = `locale=${lang}; path=/; max-age=31536000; SameSite=Lax`;
    setLanguageState(lang);
    startTransition(() => {
      router.refresh();
    });
  };

  const t = getTranslations(language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
