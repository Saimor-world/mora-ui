'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';

interface CompanyLogoProps {
    /** Logo URL or base64 */
    src?: string | null;
    /** Company name for fallback initial */
    companyName?: string;
    /** Size variant */
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    /** Show animated ring */
    animated?: boolean;
    /** Accent color (extracted from logo or brand) */
    accentColor?: string;
    /** Click handler */
    onClick?: () => void;
    /** Additional className */
    className?: string;
}

/**
 * CompanyLogo - Universal Company Logo Display
 * 
 * Used everywhere:
 * - Center of home view
 * - Inside the Orb
 * - Registration flow
 * - Settings
 * - Lock screen
 * 
 * Handles:
 * - Image logos (circular crop)
 * - Fallback to company initial
 * - Animated glow ring
 * - Different sizes
 */
export const CompanyLogo: React.FC<CompanyLogoProps> = ({
    src,
    companyName = 'Company',
    size = 'md',
    animated = true,
    accentColor = '#D4AF37',
    onClick,
    className = ''
}) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    // Size configurations
    const sizes = {
        xs: { container: 'w-8 h-8', image: 'w-6 h-6', text: 'text-sm', ring: 1 },
        sm: { container: 'w-12 h-12', image: 'w-10 h-10', text: 'text-lg', ring: 1 },
        md: { container: 'w-20 h-20', image: 'w-16 h-16', text: 'text-3xl', ring: 2 },
        lg: { container: 'w-32 h-32', image: 'w-24 h-24', text: 'text-5xl', ring: 3 },
        xl: { container: 'w-40 h-40', image: 'w-32 h-32', text: 'text-7xl', ring: 4 },
    };

    const config = sizes[size];
    const initial = companyName.charAt(0).toUpperCase();
    const hasValidImage = src && !imageError;

    return (
        <motion.div
            className={`${config.container} rounded-full flex items-center justify-center relative cursor-pointer ${className}`}
            style={{
                background: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(10,10,10,0.98) 100%)',
                border: `${config.ring}px solid ${accentColor}30`,
                boxShadow: `
                    0 0 ${size === 'lg' || size === 'xl' ? 60 : 30}px ${accentColor}20,
                    inset 0 0 ${size === 'lg' || size === 'xl' ? 40 : 20}px ${accentColor}05
                `
            }}
            onClick={onClick}
            whileHover={onClick ? { scale: 1.05 } : undefined}
            whileTap={onClick ? { scale: 0.98 } : undefined}
        >
            {/* Animated Ring - Only for larger sizes */}
            {animated && (size === 'lg' || size === 'xl' || size === 'md') && (
                <motion.div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                        border: `1px solid transparent`,
                        background: `linear-gradient(135deg, ${accentColor}50 0%, transparent 50%, rgba(16,185,129,0.3) 100%)`,
                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        WebkitMaskComposite: 'xor',
                        maskComposite: 'exclude',
                        padding: '1px'
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                />
            )}

            {/* Logo Content */}
            <div className={`${config.image} rounded-full overflow-hidden flex items-center justify-center relative z-10`}
                style={{ background: hasValidImage ? 'transparent' : 'rgba(0,0,0,0.3)' }}
            >
                {hasValidImage && (
                    <img
                        src={src}
                        alt={companyName}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                        onLoad={() => setImageLoaded(true)}
                        style={{
                            filter: `drop-shadow(0 0 10px ${accentColor}50)`,
                            opacity: imageLoaded ? 1 : 0,
                            transition: 'opacity 0.3s ease'
                        }}
                    />
                )}
                {(!hasValidImage || !imageLoaded) && (
                    <span
                        className={`${config.text} font-light`}
                        style={{
                            background: `linear-gradient(180deg, rgba(255,255,255,0.9) 0%, ${accentColor} 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.2))',
                            opacity: hasValidImage && !imageLoaded ? 0.7 : 1
                        }}
                    >
                        {initial}
                    </span>
                )}
            </div>
        </motion.div>
    );
};

/**
 * CompanyLogoUpload - Logo upload component for registration
 */
interface CompanyLogoUploadProps {
    value?: string | null;
    onChange: (logoUrl: string | null) => void;
    companyName?: string;
}

export const CompanyLogoUpload: React.FC<CompanyLogoUploadProps> = ({
    value,
    onChange,
    companyName = 'Company'
}) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith('image/')) {
            return;
        }

        // Convert to base64 for preview (in production: upload to storage)
        const reader = new FileReader();
        reader.onload = (e) => {
            onChange(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div
                className={`relative cursor-pointer transition-all ${isDragging ? 'scale-105' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('logo-upload-input')?.click()}
            >
                <CompanyLogo
                    src={value}
                    companyName={companyName}
                    size="lg"
                    animated={!!value}
                />

                {/* Upload overlay */}
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <div className="text-center text-white/80">
                        <Building2 size={24} className="mx-auto mb-1" />
                        <span className="text-xs">Logo hochladen</span>
                    </div>
                </div>
            </div>

            <input
                id="logo-upload-input"
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="hidden"
            />

            <p className="text-xs text-white/40 text-center">
                Klicken oder Bild hierher ziehen
            </p>

            {value && (
                <button
                    onClick={(e) => { e.stopPropagation(); onChange(null); }}
                    className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                >
                    Logo entfernen
                </button>
            )}
        </div>
    );
};

export default CompanyLogo;
