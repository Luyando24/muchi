import React from 'react';
import { cn } from '@/lib/utils';

interface FlovaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon';
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16'
};

export default function FlovaLogo({ 
  className, 
  size = 'md', 
  variant = 'full' 
}: FlovaLogoProps) {
  const LogoIcon = () => (
    <svg
      viewBox="0 0 40 40"
      className={cn(sizeClasses[size], className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Main rectangular shape leaning right, forming subtle F */}
      <g transform="rotate(15 20 20)">
        {/* Main F structure - thick rectangles with curved edges */}
        <rect
          x="14"
          y="6"
          width="6"
          height="20"
          rx="3"
          fill="currentColor"
          className="text-primary"
        />
        
        {/* Top horizontal rectangle - thick with curved edges */}
        <rect
          x="20"
          y="6"
          width="10"
          height="6"
          rx="3"
          fill="currentColor"
          className="text-primary"
        />
        
        {/* Middle horizontal rectangle - thick with curved edges */}
        <rect
          x="20"
          y="16"
          width="7"
          height="6"
          rx="3"
          fill="currentColor"
          className="text-primary"
        />
      </g>
      
      {/* Accent elements */}
      <circle cx="30" cy="12" r="1.5" fill="currentColor" className="text-primary/40" />
      <circle cx="32" cy="28" r="1.2" fill="currentColor" className="text-primary/30" />
    </svg>
  );

  if (variant === 'icon') {
    return <LogoIcon />;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LogoIcon />
      <span className="font-bold text-lg tracking-tight">Flova</span>
    </div>
  );
}

// Export individual components for flexibility
export const FlovaIcon = (props: Omit<FlovaLogoProps, 'variant'>) => (
  <FlovaLogo {...props} variant="icon" />
);

export const FlovaWordmark = ({ className }: { className?: string }) => (
  <span className={cn('font-bold text-lg tracking-tight', className)}>Flova</span>
);