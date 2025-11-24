"use client";

import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
    label: string;
    onClick?: () => void;
    isActive?: boolean;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
    return (
        <div className="flex items-center gap-2 text-sm">
            {items.map((item, index) => (
                <React.Fragment key={index}>
                    {index > 0 && (
                        <ChevronRight className="w-3 h-3 text-emerald-500/30" />
                    )}
                    {item.onClick ? (
                        <button
                            onClick={item.onClick}
                            className="text-emerald-400/60 hover:text-emerald-300 transition-colors tracking-wider uppercase text-xs"
                        >
                            {item.label}
                        </button>
                    ) : (
                        <span className={`tracking-wider uppercase text-xs ${item.isActive ? 'text-emerald-100 font-medium' : 'text-emerald-500/40'}`}>
                            {item.label}
                        </span>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};
