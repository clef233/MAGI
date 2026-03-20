'use client'

import { useEffect, useState } from 'react'
import Splash from '@/components/Splash'
import Arena from '@/components/Arena'

export default function Home() {
  const [showSplash, setShowSplash] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSplashComplete = () => {
    setShowSplash(false)
  }

  if (!mounted) return null

  return (
    <main className="min-h-screen">
      {showSplash ? (
        <Splash onComplete={handleSplashComplete} />
      ) : (
        <Arena />
      )}
    </main>
  )
}