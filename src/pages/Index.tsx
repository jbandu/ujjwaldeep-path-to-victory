import React from 'react';
import HeroSection from '@/components/HeroSection';
import GameficationSection from '@/components/GameficationSection';
import FeatureSection from '@/components/FeatureSection';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <GameficationSection />
      <FeatureSection />
      <Footer />
    </div>
  );
};

export default Index;
