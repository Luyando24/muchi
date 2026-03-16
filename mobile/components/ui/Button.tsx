import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { cn } from '../../lib/utils';

interface ButtonProps {
  onPress: () => void;
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  className?: string;
  disabled?: boolean;
}

export function Button({ 
  onPress, 
  title, 
  loading = false, 
  variant = 'primary', 
  className = '',
  disabled = false
}: ButtonProps) {
  const variants = {
    primary: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    outline: 'border border-input bg-background text-foreground',
    ghost: 'bg-transparent text-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading || disabled}
      className={cn(
        'h-12 px-4 rounded-md flex-row items-center justify-center',
        variants[variant],
        (loading || disabled) && 'opacity-50',
        className
      )}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#000' : '#fff'} />
      ) : (
        <Text className={cn(
          'text-base font-semibold',
          variant === 'primary' && 'text-white',
          variant === 'destructive' && 'text-white',
          variant === 'secondary' && 'text-secondary-foreground',
          variant === 'outline' && 'text-foreground',
          variant === 'ghost' && 'text-foreground',
        )}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
