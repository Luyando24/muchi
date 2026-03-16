import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import { cn } from '../../lib/utils';

interface CardProps extends ViewProps {
  className?: string;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <View 
      className={cn("bg-card rounded-lg border border-border p-4 shadow-sm", className)} 
      {...props}
    >
      {children}
    </View>
  );
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <View className={cn("mb-2", className)} {...props}>
      {children}
    </View>
  );
}

export function CardTitle({ className, children, ...props }: CardProps & { children: React.ReactNode }) {
  return (
    <Text className={cn("text-lg font-semibold text-card-foreground", className)} {...props}>
      {children}
    </Text>
  );
}

export function CardContent({ className, children, ...props }: CardProps) {
  return (
    <View className={cn("", className)} {...props}>
      {children}
    </View>
  );
}
