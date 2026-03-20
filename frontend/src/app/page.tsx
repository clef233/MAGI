'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Splash from '@/components/Splash'
import Arena from '@/components/Arena'

export default function Home() {
  const [showSplash, setShowSplash] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    // Check if user has seen splash before
    const hasSeenSplash = localStorage.getItem('magi-splash-seen')
    if (hasSeenSplash) {
      setShowSplash(false)
    }
  }, [])

  const handleSplashComplete = () => {
    localStorage.setItem('magi-splash-seen', 'true')
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