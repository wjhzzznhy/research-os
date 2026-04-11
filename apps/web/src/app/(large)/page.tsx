'use client'

import { useState } from 'react'
import Header from '@/components/large/Header'
import HeroSection from '@/components/large/HeroSection'
import FeatureCards from '@/components/large/FeatureCards'
import Announcement from '@/components/large/Announcement'
import SideToolbar from '@/components/large/SideToolbar'
import Footer from '@/components/large/Footer'

export default function Home() {
  const [activeTab, setActiveTab] = useState('home')

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main>
        <HeroSection />
        <Announcement />
        <FeatureCards />
      </main>
      <SideToolbar />
      <Footer />
    </div>
  )
}
