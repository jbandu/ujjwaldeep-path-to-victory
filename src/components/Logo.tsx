import React from 'react';
import { Flame } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-6xl'
  };

  const iconSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-primary rounded-full blur-lg opacity-50 animate-pulse-glow"></div>
        <div className="relative bg-gradient-primary rounded-full p-2 shadow-warm">
          <Flame className={`${iconSizes[size]} text-primary-foreground animate-float`} />
        </div>
      </div>
      <div className="flex flex-col">
        <h1 className={`${sizeClasses[size]} font-bold font-heading bg-gradient-hero bg-clip-text text-transparent`}>
          UjjwalDeep
        </h1>
        {size !== 'sm' && (
          <p className="text-xs text-muted-foreground font-medium tracking-wide">
            Path to Victory
          </p>
        )}
      </div>
    </div>
  );
};

export default Logo;