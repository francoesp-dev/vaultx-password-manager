import React, { createContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

import en from '../locals/en.json';
import es from '../locals/es.json';

type Language = 'en' | 'es';

const translations: any = { en, es };

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export const LanguageContext = createContext<LanguageContextProps>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLangState] = useState<Language>('en');

  useEffect(() => {
    SecureStore.getItemAsync('VAULT_LANGUAGE').then(lang => {
      if (lang === 'es' || lang === 'en') setLangState(lang as Language);
    });
  }, []);

  const setLanguage = async (lang: Language) => {
    setLangState(lang);
    await SecureStore.setItemAsync('VAULT_LANGUAGE', lang);
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};