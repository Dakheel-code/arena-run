import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type ThemeColor = 'amber' | 'blue' | 'green' | 'purple' | 'red' | 'pink' | 'cyan'
export type ThemeMode = 'dark' | 'light'

interface ThemeContextType {
  themeColor: ThemeColor
  setThemeColor: (color: ThemeColor) => void
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  colors: {
    primary: string
    primaryHover: string
    primaryBg: string
    primaryBorder: string
    primaryText: string
  }
}

const themeColors: Record<ThemeColor, ThemeContextType['colors']> = {
  amber: {
    primary: 'bg-amber-500',
    primaryHover: 'hover:bg-amber-600',
    primaryBg: 'bg-amber-500/20',
    primaryBorder: 'border-amber-500/30',
    primaryText: 'text-amber-400',
  },
  blue: {
    primary: 'bg-blue-500',
    primaryHover: 'hover:bg-blue-600',
    primaryBg: 'bg-blue-500/20',
    primaryBorder: 'border-blue-500/30',
    primaryText: 'text-blue-400',
  },
  green: {
    primary: 'bg-green-500',
    primaryHover: 'hover:bg-green-600',
    primaryBg: 'bg-green-500/20',
    primaryBorder: 'border-green-500/30',
    primaryText: 'text-green-400',
  },
  purple: {
    primary: 'bg-purple-500',
    primaryHover: 'hover:bg-purple-600',
    primaryBg: 'bg-purple-500/20',
    primaryBorder: 'border-purple-500/30',
    primaryText: 'text-purple-400',
  },
  red: {
    primary: 'bg-red-500',
    primaryHover: 'hover:bg-red-600',
    primaryBg: 'bg-red-500/20',
    primaryBorder: 'border-red-500/30',
    primaryText: 'text-red-400',
  },
  pink: {
    primary: 'bg-pink-500',
    primaryHover: 'hover:bg-pink-600',
    primaryBg: 'bg-pink-500/20',
    primaryBorder: 'border-pink-500/30',
    primaryText: 'text-pink-400',
  },
  cyan: {
    primary: 'bg-cyan-500',
    primaryHover: 'hover:bg-cyan-600',
    primaryBg: 'bg-cyan-500/20',
    primaryBorder: 'border-cyan-500/30',
    primaryText: 'text-cyan-400',
  },
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeColor, setThemeColorState] = useState<ThemeColor>('amber')
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark')

  useEffect(() => {
    // Load theme from localStorage or use default
    const savedTheme = localStorage.getItem('themeColor') as ThemeColor
    const savedMode = localStorage.getItem('themeMode') as ThemeMode
    
    if (savedTheme && themeColors[savedTheme]) {
      setThemeColorState(savedTheme)
      applyThemeToCSS(savedTheme)
    } else {
      applyThemeToCSS('amber')
    }
    
    if (savedMode && (savedMode === 'dark' || savedMode === 'light')) {
      setThemeModeState(savedMode)
      applyModeToCSS(savedMode)
    } else {
      applyModeToCSS('dark')
    }
  }, [])

  const applyThemeToCSS = (color: ThemeColor) => {
    document.documentElement.setAttribute('data-theme', color)
  }

  const applyModeToCSS = (mode: ThemeMode) => {
    document.documentElement.setAttribute('data-mode', mode)
    if (mode === 'light') {
      document.documentElement.classList.add('light-mode')
      document.documentElement.classList.remove('dark-mode')
    } else {
      document.documentElement.classList.add('dark-mode')
      document.documentElement.classList.remove('light-mode')
    }
  }

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color)
    applyThemeToCSS(color)
    localStorage.setItem('themeColor', color)
  }

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode)
    applyModeToCSS(mode)
    localStorage.setItem('themeMode', mode)
  }

  return (
    <ThemeContext.Provider value={{ 
      themeColor, 
      setThemeColor,
      themeMode,
      setThemeMode,
      colors: themeColors[themeColor] 
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
