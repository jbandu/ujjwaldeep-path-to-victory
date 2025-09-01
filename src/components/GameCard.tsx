import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface GameCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

const GameCard: React.FC<GameCardProps> = ({ icon, title, description, delay = 0 }) => {
  return (
    <Card 
      className="relative overflow-hidden bg-gradient-card border-border/50 hover:shadow-warm transition-all duration-300 hover:scale-105 animate-fade-in group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
      <CardContent className="p-6 text-center relative z-10">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-gradient-primary rounded-full shadow-glow group-hover:animate-bounce-in">
            {icon}
          </div>
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2 font-heading">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
};

export default GameCard;