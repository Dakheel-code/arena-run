import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, Language, TranslationKey } from '../i18n/translations'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
  isRTL: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language
    return saved && translations[saved] ? saved : 'en'
  })

  // Set LTR direction on initial load
  useEffect(() => {
    document.documentElement.dir = 'ltr'
    document.documentElement.lang = language
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
    // Keep LTR direction for all languages
    document.documentElement.dir = 'ltr'
    document.documentElement.lang = lang
  }

  const t = (key: TranslationKey): string => {
    return translations[language]?.[key] || translations.en[key] || key
  }

  const isRTL = false // Always LTR for all languages

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
