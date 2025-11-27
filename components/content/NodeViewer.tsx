"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Highlight, themes } from 'prism-react-renderer';
import { FileText, Code, ExternalLink } from 'lucide-react';

interface NodeViewerProps {
    content?: string;
    type: 'note' | 'document' | 'link' | 'code' | 'other';
    className?: string;
}

export const NodeViewer: React.FC<NodeViewerProps> = ({ content, type, className = '' }) => {
    if (!content) {
        return (
            <div className={`flex flex-col items-center justify-center h-64 text-emerald-500/30 ${className}`}>
                <FileText size={48} strokeWidth={1} className="mb-4 opacity-50" />
                <p className="text-sm font-light tracking-wider uppercase">No Content</p>
            </div>
        );
    }

    // Special handling for Link type
    if (type === 'link') {
        return (
            <div className={`p-6 ${className}`}>
                <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-mora-gold/30 transition-colors group">
                    <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:text-mora-gold transition-colors">
                        <ExternalLink size={24} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <h3 className="text-sm font-medium text-emerald-100 mb-1">External Link</h3>
                        <a
                            href={content}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-mora-gold hover:underline break-all text-lg"
                        >
                            {content}
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // Code Viewer
    if (type === 'code') {
        return (
            <div className={`relative group ${className}`}>
                <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/50 text-[10px] text-emerald-500/50 uppercase tracking-wider border border-white/5">
                    Code
                </div>
                <Highlight
                    theme={themes.vsDark}
                    code={content}
                    language="typescript" // Auto-detect would be better, defaulting to TS for now
                >
                    {({ className, style, tokens, getLineProps, getTokenProps }) => (
                        <pre className={`p-4 rounded-xl bg-[#0a0a0a] border border-white/10 overflow-x-auto custom-scrollbar text-sm font-mono ${className}`} style={style}>
                            {tokens.map((line, i) => (
                                <div key={i} {...getLineProps({ line })} className="table-row">
                                    <span className="table-cell text-right pr-4 select-none opacity-30 text-xs w-8 border-r border-white/5 mr-4">
                                        {i + 1}
                                    </span>
                                    <span className="table-cell pl-4">
                                        {line.map((token, key) => (
                                            <span key={key} {...getTokenProps({ token })} />
                                        ))}
                                    </span>
                                </div>
                            ))}
                        </pre>
                    )}
                </Highlight>
            </div>
        );
    }

    // Markdown Viewer (Default for notes/documents)
    return (
        <div className={`prose prose-invert prose-emerald max-w-none ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Custom styling for markdown elements to match Mora UI
                    h1: ({ node, ...props }) => <h1 className="text-2xl font-light text-mora-gold mb-6 border-b border-white/10 pb-2" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-xl font-medium text-emerald-100 mt-8 mb-4" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-lg font-medium text-emerald-200 mt-6 mb-3" {...props} />,
                    p: ({ node, ...props }) => <p className="text-emerald-100/80 leading-relaxed mb-4" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-4 space-y-1 text-emerald-100/80 mb-4" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-4 space-y-1 text-emerald-100/80 mb-4" {...props} />,
                    a: ({ node, ...props }) => <a className="text-mora-gold hover:underline decoration-1 underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-mora-gold/50 pl-4 italic text-emerald-200/70 my-4" {...props} />,
                    code: ({ node, className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match;

                        if (isInline) {
                            return (
                                <code className="px-1.5 py-0.5 rounded bg-white/10 text-emerald-200 text-sm font-mono" {...props}>
                                    {children}
                                </code>
                            );
                        }

                        return (
                            <div className="relative my-4 rounded-lg overflow-hidden border border-white/10 bg-[#0a0a0a]">
                                <div className="absolute top-0 right-0 px-2 py-1 bg-white/5 text-[10px] text-emerald-500 uppercase">
                                    {match?.[1] || 'code'}
                                </div>
                                <Highlight
                                    theme={themes.vsDark}
                                    code={String(children).replace(/\n$/, '')}
                                    language={match?.[1] || 'text'}
                                >
                                    {({ className, style, tokens, getLineProps, getTokenProps }) => (
                                        <pre className={`p-4 overflow-x-auto custom-scrollbar text-sm font-mono ${className}`} style={{ ...style, background: 'transparent' }}>
                                            {tokens.map((line, i) => (
                                                <div key={i} {...getLineProps({ line })}>
                                                    {line.map((token, key) => (
                                                        <span key={key} {...getTokenProps({ token })} />
                                                    ))}
                                                </div>
                                            ))}
                                        </pre>
                                    )}
                                </Highlight>
                            </div>
                        );
                    }
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};
