import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import HeroSection from '@/components/HeroSection';
import GameficationSection from '@/components/GameficationSection';
import FeatureSection from '@/components/FeatureSection';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      
      {/* Enter App CTA Section */}
      <section className="py-16 bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Transform Your Exam Preparation?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of students who are already using UjjwalDeep to ace their exams.
            Start your journey today with our comprehensive test platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/app">
              <Button size="lg" className="min-w-[200px]">
                Enter App
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="min-w-[200px]">
                Sign Up Free
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      <GameficationSection />
      <FeatureSection />
      <Footer />
    </div>
  );
};

export default Index;
