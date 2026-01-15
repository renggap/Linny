import React from 'react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
}

/**
 * Loading Spinner Component
 * 
 * DEEP REASONING CHAIN:
 * Loading states are critical for UX:
 * 1. Provides visual feedback during async operations
 * 2. Prevents user confusion about app state
 * 3. Improves perceived performance
 * 4. Reduces user frustration
 * 
 * EDGE CASE ANALYSIS:
 * - Supports multiple sizes for different contexts
 * - Optional text for context
 * - Accessible with aria-label
 * - Consistent styling across app
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text }) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };

    return (
        <div className="flex flex-col items-center justify-center p-8" role="status" aria-live="polite">
            <div className={`animate-spin rounded-full border-2 border-[#5E6AD2] border-t-transparent ${sizeClasses[size]}`} />
            {text && (
                <p className="mt-4 text-sm text-gray-400">{text}</p>
            )}
        </div>
    );
};

/**
 * Skeleton Loader Component
 * For content that's loading
 */
export const SkeletonLoader: React.FC<{ count?: number }> = ({ count = 3 }) => {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="animate-pulse">
                    <div className="h-4 bg-[#2E3036] rounded w-3/4 mb-2" />
                    <div className="h-4 bg-[#2E3036] rounded w-1/2" />
                </div>
            ))}
        </div>
    );
};

/**
 * Page Loader Component
 * Full-page loading state
 */
export const PageLoader: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#1E1F24]">
            <LoadingSpinner size="lg" text={text} />
        </div>
    );
};
