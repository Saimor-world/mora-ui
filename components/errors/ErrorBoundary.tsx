"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs errors, and displays a fallback UI instead of crashing the whole app.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return {
            hasError: true,
            error,
            errorInfo: null
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to console (in production, send to error tracking service)
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Error info:', errorInfo);

        // Update state with error details
        this.setState({
            error,
            errorInfo
        });

        // Call custom error handler if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <div className="min-h-screen bg-mora-forest flex items-center justify-center p-6">
                    <div className="max-w-2xl w-full">
                        {/* Error Card */}
                        <div className="bg-gradient-to-br from-red-900/20 to-red-950/10 border border-red-500/30 rounded-2xl p-8 backdrop-blur-xl">
                            {/* Icon */}
                            <div className="flex items-center justify-center mb-6">
                                <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                                    <AlertTriangle className="w-10 h-10 text-red-400" />
                                </div>
                            </div>

                            {/* Title */}
                            <h1 className="text-2xl font-light text-red-100 text-center mb-3 tracking-wide">
                                Something Went Wrong
                            </h1>

                            {/* Message */}
                            <p className="text-sm text-red-200/70 text-center mb-6 leading-relaxed">
                                We encountered an unexpected error. Don't worry - your data is safe.
                                <br />
                                Try refreshing the page or returning to the home screen.
                            </p>

                            {/* Error Details (Development Only) */}
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <div className="mb-6 p-4 rounded-xl bg-black/30 border border-red-500/20">
                                    <p className="text-xs font-mono text-red-300 mb-2 font-semibold">
                                        Error Details (Dev Only):
                                    </p>
                                    <p className="text-xs font-mono text-red-200/80 mb-2 break-all">
                                        {this.state.error.toString()}
                                    </p>
                                    {this.state.errorInfo && (
                                        <details className="mt-3">
                                            <summary className="text-xs text-red-300/70 cursor-pointer hover:text-red-300 mb-2">
                                                Component Stack
                                            </summary>
                                            <pre className="text-[10px] text-red-200/60 overflow-auto max-h-40 leading-relaxed">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={this.handleReset}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-100 hover:bg-red-500/20 hover:border-red-500/50 transition-all group"
                                >
                                    <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                                    <span className="text-sm font-medium">Try Again</span>
                                </button>

                                <button
                                    onClick={this.handleReload}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    <span className="text-sm font-medium">Reload Page</span>
                                </button>

                                <button
                                    onClick={this.handleGoHome}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-mora-gold/10 border border-mora-gold/30 text-mora-gold hover:bg-mora-gold/20 hover:border-mora-gold/50 transition-all"
                                >
                                    <Home className="w-4 h-4" />
                                    <span className="text-sm font-medium">Go Home</span>
                                </button>
                            </div>
                        </div>

                        {/* Help Text */}
                        <p className="text-xs text-emerald-500/30 text-center mt-6 font-mono tracking-wider">
                            If this persists, please contact support
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Lightweight error boundary for smaller sections
 * Shows inline error message instead of full-page fallback
 */
export class InlineErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[InlineErrorBoundary] Caught error:', error);

        this.setState({
            error,
            errorInfo
        });

        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="p-4 rounded-xl bg-red-900/10 border border-red-500/20">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-red-200 mb-1 font-medium">
                                Component Error
                            </p>
                            <p className="text-xs text-red-300/70 leading-relaxed">
                                This section encountered an error. Try refreshing the page.
                            </p>
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <p className="text-xs font-mono text-red-300/50 mt-2 break-all">
                                    {this.state.error.toString()}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
