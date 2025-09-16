import React, { ReactNode } from 'react';

// Types
interface SpinnerProps {
  size?: number;
  color?: string;
}

interface LoaderProps {
  loading: boolean;
  children: ReactNode;
  size?: number;
  color?: string;
}

// Custom Spinner Component
const Spinner = ({ size = 16, color = '#ffffff' }: SpinnerProps) => {
  return (
    <div className="inline-block">
      <div
        className="animate-spin rounded-full border-2 border-gray-300"
        style={{
          width: size,
          height: size,
          borderTopColor: color,
        }}
      />
    </div>
  );
};

// Fixed Loader Component
const Loader = ({ loading, children, size = 16, color = '#ffffff' }: LoaderProps) => {
  if (loading) {
    return <Spinner size={size} color={color} />;
  }
  
  return <>{children}</>;
};

export default Loader;