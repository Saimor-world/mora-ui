import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log to monitoring service
        console.error('[ErrorBoundary]', error, errorInfo);

        // TODO: Send to Sentry/monitoring service in production
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
            // window.Sentry?.captureException(error);
        }
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex items-center justify-center h-screen bg-[#030806]">
                    <div className="text-center p-8 max-w-md">
                        <div className="mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-light text-white mb-2">Oops!</h1>
                            <p className="text-gray-400 text-sm mb-6">
                                {this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten'}
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 transition-colors rounded text-white font-medium"
                        >
                            Seite neu laden
                        </button>
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: undefined });
                            }}
                            className="ml-3 px-6 py-3 bg-gray-700 hover:bg-gray-600 transition-colors rounded text-white font-medium"
                        >
                            Erneut versuchen
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
