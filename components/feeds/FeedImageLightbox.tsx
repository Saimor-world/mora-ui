'use client';

import React, { useCallback, useEffect } from 'react';
import { X } from 'lucide-react';

export const FeedImageLightbox: React.FC<{
    imageUrl: string;
    title: string;
    onClose: () => void;
}> = ({ imageUrl, title, onClose }) => {
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return (
        <div
            className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/88 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={onClose}
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute right-5 top-5 rounded-full border border-white/15 bg-black/50 p-2 text-white/70 transition-colors hover:bg-black/70 hover:text-white"
                aria-label="Schließen"
            >
                <X size={18} />
            </button>
            <div
                className="relative max-h-[92vh] max-w-[min(1100px,96vw)] overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={imageUrl}
                    alt={title}
                    className="max-h-[92vh] w-full object-contain"
                />
                <div className="border-t border-white/10 bg-black/55 px-4 py-3 text-sm text-white/78">
                    {title}
                </div>
            </div>
        </div>
    );
};
