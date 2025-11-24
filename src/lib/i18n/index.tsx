'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import en from './en.json';
import de from './de.json';
import ru from './ru.json';

const translations = { en, de, ru };

type Language = 'en' | 'de' | 'ru';

interface I18nContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// A simple ICU message formatter
function formatICUMessage(message: string, replacements: Record<string, string | number>) {
  if (message.includes('{count, plural')) {
    const count = replacements['count'] as number;
    const pluralMatch = message.match(/plural, *=(1) {([^}]*)} *other {([^}]*)}/);
    if (pluralMatch) {
      const singular = pluralMatch[2].replace('#', '1');
      const plural = pluralMatch[3].replace('#', String(count));
      return count === 1 ? singular : plural;
    }
  }
  
  let result = message;
  for (const placeholder in replacements) {
    result = result.replace(`{${placeholder}}`, String(replacements[placeholder]));
  }
  return result;
}


export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let result: any = translations[language];
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        // Fallback to English if translation is missing
        let fallbackResult: any = translations.en;
        for (const fk of keys) {
          fallbackResult = fallbackResult?.[fk];
        }
        result = fallbackResult;
        break; 
      }
    }
    
    let translation = result || key;

    if (replacements && typeof translation === 'string') {
      return formatICUMessage(translation, replacements);
    }

    return translation;
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
