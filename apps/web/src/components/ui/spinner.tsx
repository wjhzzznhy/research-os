import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'white' | 'gray' | 'primary';
}

export default function Spinner({ size = 'md', color = 'white' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-8 h-8',
  };

  const colorClasses = {
    white: 'border-white border-t-transparent',
    gray: 'border-gray-700 border-t-transparent',
    primary: 'border-gray-900 border-t-transparent',
  };

  return (
    <div
      className={`${sizeClasses[size]} ${colorClasses[color]} border-2 rounded-full animate-spin`}
    />
  );
}
