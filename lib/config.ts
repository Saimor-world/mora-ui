/**
 * Centralized configuration with validation and fallbacks
 * All environment variables should be accessed through this file
 */

export type ChatSource = 'objects' | 'semantic';

export interface AppConfig {
  // Core API
  coreApiUrl: string;
  jwtToken: string;
  authHeader: string;

  // Chat
  chatSource: ChatSource;

  // n8n Webhooks
  n8nEmailDigest?: string;
  n8nBroadcastDoc?: string;
  n8nDuplicateHunter?: string;

  // Development
  enableDiagnostics: boolean;
  isDevelopment: boolean;
}

class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
    this.validate();
  }

  private loadConfig(): AppConfig {
    const isDevelopment = process.env.NODE_ENV === 'development';

    // IMPORTANT: Next.js requires DIRECT access to process.env.NEXT_PUBLIC_*
    // Dynamic access via process.env[key] does NOT work because values are inlined at build time
    const jwtToken = process.env.NEXT_PUBLIC_JWT_TOKEN || process.env.NEXT_PUBLIC_ADMIN_TOKEN || '';
    const coreApiUrl = process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:8000';
    const authHeader = process.env.NEXT_PUBLIC_AUTH_HEADER || 'Authorization';
    const chatSource = (process.env.NEXT_PUBLIC_CHAT_SOURCE || 'objects') as ChatSource;
    const n8nEmailDigest = process.env.NEXT_PUBLIC_N8N_EMAIL_DIGEST;
    const n8nBroadcastDoc = process.env.NEXT_PUBLIC_N8N_BROADCAST_DOC;
    const n8nDuplicateHunter = process.env.NEXT_PUBLIC_N8N_DUPLICATE_HUNTER;
    const enableDiagnostics = process.env.NEXT_PUBLIC_ENABLE_DIAGNOSTICS === 'true';

    // DEV LOGGING
    if (isDevelopment) {
      console.log('[ConfigManager] ✅ Loaded config with direct access');
      console.log('[ConfigManager] JWT Token length:', jwtToken.length);
      console.log('[ConfigManager] Core API URL:', coreApiUrl);
    }

    return {
      coreApiUrl,
      jwtToken,
      authHeader,
      chatSource,
      n8nEmailDigest,
      n8nBroadcastDoc,
      n8nDuplicateHunter,
      enableDiagnostics,
      isDevelopment,
    };
  }

  private getEnv(key: string, fallback?: string): string {
    const value = process.env[key];

    if (value === undefined || value === '') {
      if (fallback !== undefined) {
        return fallback;
      }
      // Don't throw for optional values
      return '';
    }

    return value;
  }

  private validate() {
    const errors: string[] = [];
    const tokensMissing = !this.config.jwtToken;

    // Required fields
    if (!this.config.coreApiUrl) {
      errors.push('NEXT_PUBLIC_CORE_API_URL is required');
    }


    // Static tokens are no longer strictly required in dev due to dynamic auth
    // if (tokensMissing) {
    //   errors.push('NEXT_PUBLIC_JWT_TOKEN or NEXT_PUBLIC_ADMIN_TOKEN is required');
    // }

    // Validate URL format
    if (this.config.coreApiUrl) {
      try {
        new URL(this.config.coreApiUrl);
      } catch (e) {
        errors.push(`NEXT_PUBLIC_CORE_API_URL is not a valid URL: ${this.config.coreApiUrl}`);
      }
    }

    // Validate chat source
    if (!['objects', 'semantic'].includes(this.config.chatSource)) {
      console.warn(
        `Invalid NEXT_PUBLIC_CHAT_SOURCE: ${this.config.chatSource}. Falling back to 'objects'`
      );
      this.config.chatSource = 'objects';
    }

    // Only throw in development
    if (errors.length > 0 && this.config.isDevelopment) {
      console.error('❌ Configuration Errors:\n', errors.join('\n'));
      // Metric hint removed as tokens are dynamic now
    }
  }

  public getConfig(): Readonly<AppConfig> {
    return this.config;
  }

  public getCoreApiUrl(): string {
    return this.config.coreApiUrl;
  }

  public getJwtToken(): string {
    return this.config.jwtToken;
  }

  public getAuthHeader(): string {
    return this.config.authHeader || 'Authorization';
  }
  public getChatSource(): ChatSource {
    return this.config.chatSource;
  }

  public isWebhookConfigured(workflow: 'email_digest' | 'broadcast_doc' | 'duplicate_hunter'): boolean {
    switch (workflow) {
      case 'email_digest':
        return !!this.config.n8nEmailDigest;
      case 'broadcast_doc':
        return !!this.config.n8nBroadcastDoc;
      case 'duplicate_hunter':
        return !!this.config.n8nDuplicateHunter;
      default:
        return false;
    }
  }

  public getWebhookUrl(workflow: 'email_digest' | 'broadcast_doc' | 'duplicate_hunter'): string | undefined {
    switch (workflow) {
      case 'email_digest':
        return this.config.n8nEmailDigest;
      case 'broadcast_doc':
        return this.config.n8nBroadcastDoc;
      case 'duplicate_hunter':
        return this.config.n8nDuplicateHunter;
      default:
        return undefined;
    }
  }

  public isDiagnosticsEnabled(): boolean {
    return this.config.enableDiagnostics && this.config.isDevelopment;
  }
}

// Singleton instance
const configManager = new ConfigManager();

/**
 * Get the application configuration
 * @returns Readonly configuration object
 */
export function getConfig(): Readonly<AppConfig> {
  return configManager.getConfig();
}

/**
 * Get Core API base URL
 */
export function getCoreApiUrl(): string {
  return configManager.getCoreApiUrl();
}

/**
 * Get JWT token for authentication
 */
export function getJwtToken(): string {
  return configManager.getJwtToken();
}

/**
 * Get auth header name (defaults to Authorization)
 */
export function getAuthHeader(): string {
  return configManager.getAuthHeader();
}

/**
 * Get chat datasource (objects or semantic)
 */
export function getChatSource(): ChatSource {
  return configManager.getChatSource();
}

/**
 * Check if diagnostics panel should be shown
 */
export function isDiagnosticsEnabled(): boolean {
  return configManager.isDiagnosticsEnabled();
}

/**
 * Check if n8n webhook is configured
 */
export function isWebhookConfigured(workflow: 'email_digest' | 'broadcast_doc' | 'duplicate_hunter'): boolean {
  return configManager.isWebhookConfigured(workflow);
}

/**
 * Get n8n webhook URL
 */
export function getWebhookUrl(workflow: 'email_digest' | 'broadcast_doc' | 'duplicate_hunter'): string | undefined {
  return configManager.getWebhookUrl(workflow);
}

// Export singleton for direct access if needed
export default configManager;
