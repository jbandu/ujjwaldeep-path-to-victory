import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Logo from './Logo';
import { ArrowRight, Play } from 'lucide-react';
const HeroSection: React.FC = () => {
  return (
    <section className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-primary rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-gradient-hero rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-accent rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8 animate-scale-in">
          <Logo size="xl" />
        </div>
        
        {/* Tagline */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 font-heading animate-fade-in leading-tight">
          <span className="bg-gradient-hero bg-clip-text text-transparent">
            Illuminating the Path
          </span>
          <br />
          <span className="text-foreground">
            to Victory in Every Exam
          </span>
        </h1>
        
        {/* Description */}
        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed animate-slide-in-left" style={{ animationDelay: '300ms' }}>
          The most engaging exam preparation platform in India. 
          Gamified learning meets affordability - designed for students who dare to dream big.
        </p>
        
        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-in-right" style={{ animationDelay: '600ms' }}>
          <Button variant="cta" size="xl" className="min-w-48" asChild>
            <Link to="/auth">
              Start Free Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button variant="outline" size="xl" className="min-w-48 hover:bg-primary/10">
            <Play className="mr-2 h-5 w-5" />
            Watch Demo
          </Button>
        </div>
        
        {/* Trust indicators */}
        <div className="mt-12 animate-fade-in" style={{ animationDelay: '900ms' }}>
          <p className="text-sm text-muted-foreground mb-4">Trusted by students across India</p>
          <div className="flex justify-center gap-8 text-sm font-semibold text-muted-foreground">
            <div>🎯 NEET Ready</div>
            <div>📚 JEE Focused</div>
            <div>🏆 UPSC Prep</div>
            <div>💼 Banking Exams</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;