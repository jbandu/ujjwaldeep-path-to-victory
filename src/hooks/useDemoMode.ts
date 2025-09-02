import { useEffect, useState } from 'react'

export function isDemoEnabled(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true'
}

export function requireRealData() {
  if (isDemoEnabled()) {
    throw new Error('Real data required but demo mode is ON')
  }
}

export function useDemoMode() {
  const [demoMode, setDemoMode] = useState<boolean>(() => {
    // Check env variable first, then localStorage for runtime override
    const envDemo = isDemoEnabled()
    const savedDemo = localStorage.getItem('ujjwaldeep_demoMode')
    return savedDemo !== null ? savedDemo === 'true' : envDemo
  })
  
  useEffect(() => {
    const saved = localStorage.getItem('ujjwaldeep_demoMode')
    if (saved !== null) {
      setDemoMode(saved === 'true')
    } else {
      setDemoMode(isDemoEnabled())
    }
  }, [])
  
  const updateDemoMode = (mode: boolean) => {
    setDemoMode(mode)
    localStorage.setItem('ujjwaldeep_demoMode', String(mode))
  }
  
  return { demoMode, setDemoMode: updateDemoMode }
}