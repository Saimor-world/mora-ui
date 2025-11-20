'use client';

import React, { useCallback, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';

interface FileUploadZoneProps {
    onFilesUploaded: (files: File[]) => void;
    onClose: () => void;
}

export function FileUploadZone({ onFilesUploaded, onClose }: FileUploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        setSelectedFiles(prev => [...prev, ...files]);
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setSelectedFiles(prev => [...prev, ...files]);
        }
    }, []);

    const handleUpload = () => {
        if (selectedFiles.length > 0) {
            onFilesUploaded(selectedFiles);
            setSelectedFiles([]);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-2xl mx-4 bg-mora-forest/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 animate-in slide-in-from-bottom duration-500">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-emerald-400/50 hover:text-emerald-100 transition-all"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-emerald-50 mb-2">Add to Mycelium</h2>
                    <p className="text-sm text-emerald-200/60">Upload files to integrate them into your knowledge network</p>
                </div>

                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 ${isDragging
                            ? 'border-mora-gold bg-mora-gold/10 scale-[1.02]'
                            : 'border-white/20 bg-white/5 hover:border-emerald-400/40 hover:bg-white/10'
                        }`}
                >
                    <input
                        type="file"
                        id="file-upload"
                        multiple
                        onChange={handleFileSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-4 pointer-events-none">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Upload className="w-8 h-8 text-emerald-400" />
                        </div>
                        <div className="text-center">
                            <p className="text-emerald-100 font-medium mb-1">Drop files here or click to browse</p>
                            <p className="text-xs text-emerald-200/50">PDF, TXT, MD, DOCX, and more</p>
                        </div>
                    </div>
                </div>

                {selectedFiles.length > 0 && (
                    <div className="mt-6 space-y-2">
                        <p className="text-xs uppercase tracking-wider text-emerald-500/50 mb-3">Selected Files ({selectedFiles.length})</p>
                        <div className="max-h-40 overflow-y-auto space-y-2 custom-scrollbar">
                            {selectedFiles.map((file, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
                                >
                                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                        <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-sm text-emerald-100 truncate">{file.name}</p>
                                            <p className="text-xs text-emerald-200/50">{(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-500/20 text-red-400/50 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-8 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-lg bg-white/5 border border-white/10 text-emerald-200/70 text-sm font-medium hover:bg-white/10 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={selectedFiles.length === 0}
                        className="px-6 py-2.5 rounded-lg bg-mora-gold/20 border border-mora-gold/30 text-mora-gold text-sm font-medium hover:bg-mora-gold/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Add to Mycelium ({selectedFiles.length})
                    </button>
                </div>
            </div>
        </div>
    );
}
