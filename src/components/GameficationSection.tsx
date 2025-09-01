import React from 'react';
import GameCard from './GameCard';
import { Trophy, Zap, Users, Target, Medal, Crown, Award, Flame, BarChart } from 'lucide-react';

const GameficationSection: React.FC = () => {
  const gameFeatures = [
    {
      icon: <Flame className="h-8 w-8 text-primary-foreground" />,
      title: "Daily Streaks",
      description: "Build consistency with daily practice streaks. Watch your flame grow stronger each day!"
    },
    {
      icon: <Award className="h-8 w-8 text-primary-foreground" />,
      title: "Achievement Badges",
      description: "Unlock beautiful badges for milestones. From 'First Steps' to 'Champion' - collect them all!"
    },
    {
      icon: <BarChart className="h-8 w-8 text-primary-foreground" />,
      title: "Leaderboards",
      description: "Compete with friends, school, region, or go national. Climb the ranks and prove your worth!"
    },
    {
      icon: <Trophy className="h-8 w-8 text-primary-foreground" />,
      title: "Mock Battles",
      description: "Challenge friends or AI rivals in epic mock battles. May the best mind win!"
    },
    {
      icon: <Crown className="h-8 w-8 text-primary-foreground" />,
      title: "AIR Competitions",
      description: "Participate in All-India competitions with official AIR-style rankings and recognition."
    },
    {
      icon: <Target className="h-8 w-8 text-primary-foreground" />,
      title: "Quest System",
      description: "Follow quest-based study plans that adapt to your progress and keep you engaged."
    }
  ];

  return (
    <section className="py-16 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-block p-2 bg-gradient-primary rounded-full mb-4 animate-pulse-glow">
            <Zap className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-heading">
            Learning That Feels Like Gaming
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our gamification system turns exam preparation into an addictive, rewarding experience
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gameFeatures.map((feature, index) => (
            <GameCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={index * 150}
            />
          ))}
        </div>
        
        {/* Call to action */}
        <div className="text-center mt-12 animate-fade-in" style={{ animationDelay: '1200ms' }}>
          <div className="inline-block p-6 bg-gradient-card rounded-2xl shadow-warm border border-border/50">
            <Medal className="h-12 w-12 text-primary mx-auto mb-4 animate-bounce-in" />
            <h3 className="text-xl font-bold text-foreground mb-2 font-heading">
              Ready to Level Up Your Exam Prep?
            </h3>
            <p className="text-muted-foreground text-sm">
              Join thousands of students who are already gaming their way to success!
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GameficationSection;