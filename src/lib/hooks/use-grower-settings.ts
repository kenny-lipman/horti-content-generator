"use client"

import { useState, useEffect, useCallback } from "react"
import type { GrowerSettings, LogoPosition, AspectRatio, ImageSize } from "@/lib/types"

const STORAGE_KEY = "floriday-grower-settings"

const DEFAULT_SETTINGS: GrowerSettings = {
  logoUrl: null,
  logoPosition: "top-right",
  defaultAspectRatio: "1:1",
  defaultResolution: "1024",
}

function loadSettings(): GrowerSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_SETTINGS
}

function saveSettings(settings: GrowerSettings): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore storage errors
  }
}

export function useGrowerSettings() {
  const [settings, setSettings] = useState<GrowerSettings>(DEFAULT_SETTINGS)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setSettings(loadSettings())
    setIsLoaded(true)
  }, [])

  const updateSettings = useCallback(
    (updates: Partial<GrowerSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...updates }
        saveSettings(next)
        return next
      })
    },
    []
  )

  const setLogo = useCallback(
    (logoUrl: string | null) => updateSettings({ logoUrl }),
    [updateSettings]
  )

  const setLogoPosition = useCallback(
    (logoPosition: LogoPosition) => updateSettings({ logoPosition }),
    [updateSettings]
  )

  const setDefaultAspectRatio = useCallback(
    (defaultAspectRatio: AspectRatio) => updateSettings({ defaultAspectRatio }),
    [updateSettings]
  )

  const setDefaultResolution = useCallback(
    (defaultResolution: ImageSize) => updateSettings({ defaultResolution }),
    [updateSettings]
  )

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    saveSettings(DEFAULT_SETTINGS)
  }, [])

  return {
    settings,
    isLoaded,
    updateSettings,
    setLogo,
    setLogoPosition,
    setDefaultAspectRatio,
    setDefaultResolution,
    resetSettings,
  }
}
