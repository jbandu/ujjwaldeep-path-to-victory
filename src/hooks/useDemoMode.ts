'use client'
import { useEffect, useState } from 'react'

export function useDemoMode() {
  const [demoMode, setDemoMode] = useState<boolean>(true) // Default to demo mode
  
  useEffect(() => {
    const saved = localStorage.getItem('ujjwaldeep_demoMode')
    if (saved !== null) {
      setDemoMode(saved === 'true')
    }
  }, [])
  
  const updateDemoMode = (mode: boolean) => {
    setDemoMode(mode)
    localStorage.setItem('ujjwaldeep_demoMode', String(mode))
  }
  
  return { demoMode, setDemoMode: updateDemoMode }
}