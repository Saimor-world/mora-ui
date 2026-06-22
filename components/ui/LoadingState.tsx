"use client";

import React from 'react';

interface LoadingStateProps {
    message?: string;
    className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
    message = "Loading...",
    className = ""
}) => {
    return (
        <div className={`app-state app-state--loading ${className}`} aria-live="polite">
            <div className="app-loader" aria-hidden="true">
                <span />
                <span />
                <span />
            </div>
            <p>
                {message}
            </p>
        </div>
    );
};
