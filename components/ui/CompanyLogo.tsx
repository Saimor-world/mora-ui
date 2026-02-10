'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Building2, UploadCloud, Link as LinkIcon, Loader2 } from 'lucide-react';
import { uploadCompanyFile, getCompanyFileUrl } from '@/lib/api/filesClient';

interface CompanyLogoProps {
    src?: string | null;
    companyName?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    animated?: boolean;
    accentColor?: string;
    onClick?: () => void;
    className?: string;
}

/**
 * CompanyLogo - V9 Cinematic Hub
 * 
 * Dark metallic sphere with high-luminosity cyan rim glow.
 */
export const CompanyLogo: React.FC<CompanyLogoProps> = ({
    src,
    companyName = 'Company',
    size = 'md',
    animated = true,
    accentColor = '#06B6D4',
    onClick,
    className = ''
}) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const sizes = {
        xs: { container: 'w-8 h-8', image: 'w-6 h-6', text: 'text-sm', ring: 1, glow: 15 },
        sm: { container: 'w-12 h-12', image: 'w-10 h-10', text: 'text-lg', ring: 1, glow: 25 },
        md: { container: 'w-20 h-20', image: 'w-16 h-16', text: 'text-2xl', ring: 1.5, glow: 40 },
        lg: { container: 'w-36 h-36', image: 'w-28 h-28', text: 'text-5xl', ring: 2, glow: 70 },
        xl: { container: 'w-48 h-48', image: 'w-36 h-36', text: 'text-7xl', ring: 3, glow: 100 },
    };

    const config = sizes[size];
    const initial = companyName.charAt(0).toUpperCase();
    const hasValidImage = src && !imageError;

    // Use Cyan as the primary vibe color
    const vibeColor = accentColor || '#06B6D4';

    // Demo / Special Case Mapping (For seamless demo experience)
    const DEMO_LOGOS: Record<string, string> = {
        'saimor hq': '/images/saimor_logo.png',
        'saimor': '/images/saimor_logo.png',
        'saim?r': '/images/saimor_logo.png',
        'aimô': '/images/saimor_logo.png',
        'simple coffee group': '/images/simple_coffee_logo.png',
        'simple coffee': '/images/simple_coffee_logo.png'
    };

    const lowerName = companyName.toLowerCase();
    // Prioritize provided src, then check demo map, then null
    // Ideally, for a real customer, src would be valid from DB.
    // For demo, we might get an empty src, so we fallback to the asset.
    const demoLogo = Object.keys(DEMO_LOGOS).find(key => lowerName.includes(key)) ? DEMO_LOGOS[Object.keys(DEMO_LOGOS).find(key => lowerName.includes(key))!] : null;

    const displaySrc = src || demoLogo;
    const isDemoOverride = !!demoLogo;

    return (
        <motion.div
            className={`${config.container} rounded-full flex items-center justify-center relative ${onClick ? 'cursor-pointer' : ''} ${className}`}
            style={{
                background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
                border: `${config.ring}px solid rgba(255,255,255,0.1)`,
                boxShadow: `
                    0 10px 40px rgba(0,0,0,0.8),
                    0 0 ${config.glow}px ${vibeColor}40,
                    inset 0 0 25px ${vibeColor}20
                `
            }}
            onClick={onClick}
            whileHover={onClick ? { scale: 1.02, boxShadow: `0 0 ${config.glow * 1.2}px ${vibeColor}60` } : undefined}
            whileTap={onClick ? { scale: 0.98 } : undefined}
        >
            {/* V9 PREMIUM RIM HIGHLIGHT */}
            <div
                className="absolute inset-[1px] rounded-full opacity-40 pointer-events-none"
                style={{
                    borderTop: '0.5px solid rgba(255,255,255,0.8)',
                    borderLeft: '0.1px solid rgba(255,255,255,0.4)',
                }}
            />

            {/* CYAN ORBITAL PULSE */}
            {animated && (
                <motion.div
                    className="absolute inset-[-10px] rounded-full border border-cyan-500/10 pointer-events-none"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
            )}

            {/* Logo / Initial Content */}
            <div className={`${config.image} rounded-full overflow-hidden flex items-center justify-center relative z-10`}>
                {(displaySrc || hasValidImage) ? (
                    <img
                        src={displaySrc || src!}
                        alt={companyName}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                        onLoad={() => setImageLoaded(true)}
                        style={{
                            filter: isDemoOverride ? `drop-shadow(0 0 20px ${vibeColor}80)` : `drop-shadow(0 0 15px ${vibeColor}60)`,
                            opacity: imageLoaded || isDemoOverride ? 1 : 0,
                        }}
                    />
                ) : (
                    <span
                        className={`${config.text} font-extralight tracking-widest`}
                        style={{
                            color: 'white',
                            textShadow: `0 0 20px ${vibeColor}, 0 0 40px ${vibeColor}40`,
                        }}
                    >
                        {initial}
                    </span>
                )}
            </div>

            {/* GLASS OVERLAY CAUSTICS */}
            <div
                className="absolute inset-0 rounded-full pointer-events-none mix-blend-screen opacity-20"
                style={{
                    background: 'radial-gradient(circle at 30% 30%, white 0%, transparent 60%)'
                }}
            />
        </motion.div>
    );
};

/**
 * CompanyLogoUpload - V9 High Fidelity Upload
 */
interface CompanyLogoUploadProps {
    value?: string | null;
    onChange: (url: string | null) => void;
    companyName?: string;
    companyId?: string | null;
}

export const CompanyLogoUpload: React.FC<CompanyLogoUploadProps> = ({ value, onChange, companyName, companyId }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show immediate preview via DataURL
        const reader = new FileReader();
        reader.onload = () => {
            onChange(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload to backend if companyId available
        if (companyId) {
            setIsUploading(true);
            try {
                const uploaded = await uploadCompanyFile(file, companyId);
                // Use the server-side file URL instead of DataURL
                onChange(getCompanyFileUrl(uploaded.id));
            } catch (err) {
                console.error('Logo upload failed, keeping local preview:', err);
                // Keep the DataURL preview as fallback
            } finally {
                setIsUploading(false);
            }
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div
                className="relative cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <CompanyLogo
                    src={value}
                    companyName={companyName}
                    size="lg"
                    className={`transition-all duration-500 ${isHovered ? 'scale-105 brightness-110' : ''}`}
                />

                <div className="absolute inset-0 rounded-full bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center border border-emerald-500/30">
                    {isUploading ? (
                        <Loader2 className="w-8 h-8 text-emerald-400 mb-1 animate-spin" />
                    ) : (
                        <UploadCloud className="w-8 h-8 text-emerald-400 mb-1" />
                    )}
                    <span className="text-[10px] text-emerald-300 tracking-[0.2em] uppercase">
                        {isUploading ? 'Uploading...' : 'Change'}
                    </span>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                />
            </div>

            {value && (
                <button
                    onClick={() => onChange(null)}
                    className="text-[10px] text-white/30 hover:text-red-400 transition-colors uppercase tracking-[0.2em]"
                >
                    Remove Logo
                </button>
            )}
        </div>
    );
};

export default CompanyLogo;
