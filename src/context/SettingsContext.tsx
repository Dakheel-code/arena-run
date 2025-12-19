import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '../lib/api'

interface Settings {
  siteName: string
  siteDescription: string
}

interface SettingsContextType {
  settings: Settings
  refreshSettings: () => Promise<void>
}

const defaultSettings: Settings = {
  siteName: 'The Regulators RGR',
  siteDescription: 'Arena Run',
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  refreshSettings: async () => {},
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  const refreshSettings = async () => {
    try {
      const result = await api.getPublicSettings()
      if (result.settings) {
        setSettings({
          siteName: result.settings.site_name || 'The Regulators RGR',
          siteDescription: result.settings.site_description || 'Arena Run',
        })
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }
  }

  useEffect(() => {
    refreshSettings()
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
