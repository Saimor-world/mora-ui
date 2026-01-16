/**
 * Production-ready logger with conditional output
 * Prevents console.log pollution in production builds
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    [key: string]: any;
}

class Logger {
    private isDevelopment = process.env.NODE_ENV !== 'production';

    private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
        const timestamp = new Date().toISOString();
        const contextStr = context ? ` ${JSON.stringify(context)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
    }

    debug(message: string, context?: LogContext): void {
        if (this.isDevelopment) {
            console.log(this.formatMessage('debug', message, context));
        }
    }

    info(message: string, context?: LogContext): void {
        if (this.isDevelopment) {
            console.info(this.formatMessage('info', message, context));
        }
    }

    warn(message: string, context?: LogContext): void {
        console.warn(this.formatMessage('warn', message, context));
        // TODO: Send to monitoring service in production
    }

    error(message: string, error?: Error, context?: LogContext): void {
        const errorContext = {
            ...context,
            ...(error && {
                error: {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                }
            })
        };

        console.error(this.formatMessage('error', message, errorContext));

        // TODO: Send to monitoring service (Sentry, etc.)
        if (typeof window !== 'undefined' && !this.isDevelopment) {
            // window.Sentry?.captureException(error || new Error(message), {
            //     contexts: { custom: context }
            // });
        }
    }

    // Auth-specific logging helpers
    auth = {
        login: (email: string, success: boolean) => {
            this.info(`Login attempt: ${email}`, { success });
        },
        logout: (userId: string) => {
            this.info(`User logged out: ${userId}`);
        },
        register: (email: string) => {
            this.info(`Registration: ${email}`);
        },
        error: (action: string, error: Error) => {
            this.error(`Auth error during ${action}`, error);
        }
    };

    // API-specific logging helpers
    api = {
        request: (method: string, url: string) => {
            this.debug(`API ${method} ${url}`);
        },
        response: (method: string, url: string, status: number) => {
            this.debug(`API ${method} ${url} → ${status}`);
        },
        error: (method: string, url: string, error: Error) => {
            this.error(`API ${method} ${url} failed`, error);
        }
    };
}

export const logger = new Logger();
