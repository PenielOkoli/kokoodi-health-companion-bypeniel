"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type LanguageContextType = {
  lang: string;
  setLang: (lang: string) => void;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("kokoodi_lang");
    if (saved) setLangState(saved);
  }, []);

  const setLang = (next: string) => {
    setLangState(next);
    window.localStorage.setItem("kokoodi_lang", next);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
