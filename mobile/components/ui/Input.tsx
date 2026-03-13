import React from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import { cn } from '../../lib/utils';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <View className={cn('mb-4 w-full', className)}>
      {label && (
        <Text className="text-sm font-medium text-foreground mb-1">
          {label}
        </Text>
      )}
      <TextInput
        className={cn(
          'h-12 w-full px-4 border rounded-md bg-background text-foreground border-input',
          error ? 'border-destructive' : 'focus:border-primary',
        )}
        placeholderTextColor="#888"
        {...props}
      />
      {error && (
        <Text className="text-xs text-destructive mt-1">
          {error}
        </Text>
      )}
    </View>
  );
}
