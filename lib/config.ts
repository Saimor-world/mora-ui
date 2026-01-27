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
  n8nKnowledgeSync?: string;
  n8nLearningBrain?: string;

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
    // Values are inlined at build time. Trimming to ensure no invisible characters.
    const jwtToken = (process.env.NEXT_PUBLIC_JWT_TOKEN || process.env.NEXT_PUBLIC_ADMIN_TOKEN || '').trim();
    const coreApiUrl = (process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:8081').trim();
    const authHeader = (process.env.NEXT_PUBLIC_AUTH_HEADER || 'Authorization').trim();
    const chatSource = (process.env.NEXT_PUBLIC_CHAT_SOURCE || 'objects').trim() as ChatSource;

    const n8nEmailDigest = process.env.NEXT_PUBLIC_N8N_EMAIL_DIGEST;
    const n8nBroadcastDoc = process.env.NEXT_PUBLIC_N8N_BROADCAST_DOC;
    const n8nDuplicateHunter = process.env.NEXT_PUBLIC_N8N_DUPLICATE_HUNTER;
    const n8nKnowledgeSync = process.env.NEXT_PUBLIC_N8N_KNOWLEDGE_SYNC || 'https://n8n.voice.saimor.world/webhook/knowledge-sync';
    const n8nLearningBrain = process.env.NEXT_PUBLIC_N8N_LEARNING_BRAIN || 'https://n8n.voice.saimor.world/webhook/learning-brain-update';
    const enableDiagnostics = process.env.NEXT_PUBLIC_ENABLE_DIAGNOSTICS === 'true';

    // DEV LOGGING
    if (isDevelopment && typeof window !== 'undefined') {
      console.log('[ConfigManager] ✅ Configuration Loaded:', coreApiUrl);
    }

    return {
      coreApiUrl,
      jwtToken,
      authHeader,
      chatSource,
      n8nEmailDigest,
      n8nBroadcastDoc,
      n8nDuplicateHunter,
      n8nKnowledgeSync,
      n8nLearningBrain,
      enableDiagnostics,
      isDevelopment,
    };
  }

  private validate() {
    const errors: string[] = [];
    const url = this.config.coreApiUrl;

    // Validate URL format
    // RELAXED VALIDATION: Relative paths (starting with /) are valid for proxies
    if (url && !url.startsWith('/')) {
      try {
        new URL(url);
      } catch (e) {
        errors.push(`NEXT_PUBLIC_CORE_API_URL is not a valid URL: "${url}"`);
      }
    }

    // Only log errors in development
    if (errors.length > 0 && this.config.isDevelopment) {
      console.error('❌ Configuration Errors:\n', errors.join('\n'));
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

export function getConfig(): Readonly<AppConfig> {
  return configManager.getConfig();
}

export function getCoreApiUrl(): string {
  return configManager.getCoreApiUrl();
}

export function getJwtToken(): string {
  return configManager.getJwtToken();
}

export function getAuthHeader(): string {
  return configManager.getAuthHeader();
}

export function getChatSource(): ChatSource {
  return configManager.getChatSource();
}

export function isDiagnosticsEnabled(): boolean {
  return configManager.isDiagnosticsEnabled();
}

export function isWebhookConfigured(workflow: 'email_digest' | 'broadcast_doc' | 'duplicate_hunter'): boolean {
  return configManager.isWebhookConfigured(workflow);
}

export function getWebhookUrl(workflow: 'email_digest' | 'broadcast_doc' | 'duplicate_hunter'): string | undefined {
  return configManager.getWebhookUrl(workflow);
}

export default configManager;
