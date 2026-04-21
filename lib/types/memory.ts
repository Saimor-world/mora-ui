/**
 * Memory System Types - SAIMOR OS
 *
 * Type Definitions fuer das Learning Brain Memory System.
 * Basiert auf dem LearningBrain-Schema mit Multi-Tenant Support.
 *
 * Hierarchie: tenant_id -> company_id -> user_id
 */

// =============================================================================
// Kategorien (Risk Classification)
// =============================================================================

/**
 * Low-Risk Kategorien - Auto-Commit erlaubt
 * Diese Insights werden automatisch gespeichert ohne Review.
 */
export type LowRiskCategory =
  | 'preference'  // Benutzervorlieben (z.B. "bevorzugt dunklen Modus")
  | 'tone'        // Kommunikationston (z.B. "formal", "freundlich")
  | 'phrasing'    // Ausdrucksweise (z.B. "verwendet 'wir' statt 'ich'")
  | 'summary'     // Zusammenfassungen von Gespraechen
  | 'context';    // Allgemeiner Kontext ohne kritische Daten

/**
 * High-Risk Kategorien - Benoetigen Review
 * Diese Insights muessen vom Benutzer bestaetigt werden.
 */
export type HighRiskCategory =
  | 'fact'        // Fakten ueber die Firma/Projekte
  | 'goal'        // Geschaeftsziele und OKRs
  | 'price'       // Preise, Budgets, finanzielle Daten
  | 'policy'      // Firmenregeln und Policies
  | 'team'        // Team-Informationen (Rollen, Kontakte)
  | 'technical';  // Technische Spezifikationen

/**
 * Alle Memory-Kategorien (Union Type)
 */
export type MemoryCategory = LowRiskCategory | HighRiskCategory;

/**
 * Risk Level fuer Kategorisierung
 */
export type RiskLevel = 'low' | 'high';

// =============================================================================
// Core Memory Types
// =============================================================================

/**
 * Episodische Erinnerung (mem_episodic Tabelle)
 * Zeitbasierte Erinnerungen mit Decay/TTL
 */
export interface MemoryEntry {
  /** Eindeutige ID der Erinnerung */
  id: string;

  /** Tenant ID (Multi-Tenant Isolation) */
  tenant_id: string;

  /** Optional: Company/Workspace ID */
  company_id?: string | null;

  /** Optional: User ID (fuer personalisierte Erinnerungen) */
  user_id?: string | null;

  /** Quelle der Erinnerung (z.B. 'voice_learn', 'manual', 'voice_auto') */
  source: MemorySource;

  /** Zusammenfassung/Inhalt der Erinnerung */
  summary: string;

  /** Tags fuer Kategorisierung und Suche */
  tags: string[];

  /** Zeitstempel der Erstellung (ISO 8601) */
  timestamp: string;

  /** Optionale Metadaten */
  metadata?: Record<string, unknown>;

  /** Berechneter Score (relevance * recency * trust) - nur bei Suche */
  score?: number;
}

/**
 * Quellen fuer Erinnerungen
 */
export type MemorySource =
  | 'voice_learn'   // Gelernt durch Voice-Interaktion
  | 'voice_auto'    // Automatisch aus Voice extrahiert
  | 'manual'        // Manuell eingetragen
  | 'system'        // System-generiert
  | 'import';       // Importiert aus externen Quellen

/**
 * Strukturierter Fakt (mem_facts Tabelle)
 * Key-Value basierte Fakten mit Confidence Score
 */
export interface MemoryFact {
  /** Eindeutiger Key (z.B. 'learned_preference_1234') */
  key: string;

  /** Tenant ID */
  tenant_id: string;

  /** Optional: Company/Workspace ID */
  company_id?: string | null;

  /** Der Wert/Inhalt des Fakts */
  value: string;

  /** Quelle des Fakts */
  source: MemorySource;

  /** Confidence Score (0.0 - 1.0) */
  confidence: number;

  /** Erstellungszeitpunkt (ISO 8601) */
  created_at: string;

  /** Letztes Update (ISO 8601) */
  updated_at?: string;

  /** Optionale Metadaten (z.B. Kategorie) */
  metadata?: {
    category?: MemoryCategory;
    [key: string]: unknown;
  };
}

// =============================================================================
// Review Queue Types
// =============================================================================

/**
 * Status eines Review Items
 */
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

/**
 * Item in der Review Queue (mem_review_queue Tabelle)
 * High-Risk Insights die auf Bestaetigung warten
 */
export interface ReviewItem {
  /** Eindeutige ID des Review Items */
  id: number;

  /** Tenant ID */
  tenant_id: string;

  /** Optional: Company/Workspace ID */
  company_id?: string | null;

  /** Optional: User ID */
  user_id?: string | null;

  /** Das zu ueberpruefende Insight */
  insight: string;

  /** Kategorie des Insights */
  category: HighRiskCategory;

  /** Risk Level (immer 'high' fuer Review Items) */
  risk_level: RiskLevel;

  /** Aktueller Status */
  status: ReviewStatus;

  /** Erstellungszeitpunkt (ISO 8601) */
  created_at: string;

  /** Zeitpunkt des Reviews (ISO 8601, nur wenn reviewed) */
  reviewed_at?: string | null;

  /** Generierte Curiosity-Frage fuer Benutzerbestaetigung */
  curiosity_question?: string;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

/**
 * Request Payload fuer POST /v1/memory/learn
 * Neues Insight zum Lernen einreichen
 */
export interface LearnInsightPayload {
  /** Das zu lernende Insight */
  insight: string;

  /** Kategorie des Insights */
  category: MemoryCategory;

  /** Auto-Commit erlauben? (default: true) */
  auto_commit?: boolean;

  /** Optional: Explizite Company ID */
  company_id?: string;

  /** Optional: Explizite User ID */
  user_id?: string;

  /** Optionale Metadaten */
  metadata?: Record<string, unknown>;
}

/**
 * Response von POST /v1/memory/learn
 */
export interface LearnInsightResponse {
  /** Status: 'ok' | 'pending' | 'error' */
  status: 'ok' | 'pending' | 'error';

  /** Nachricht (z.B. 'Verstanden und gespeichert') */
  message: string;

  /** Risk Level des Insights */
  risk?: RiskLevel;

  /** Wurde das Insight committed? */
  committed?: boolean;

  /** Optional: ID des erstellten Memory Entries */
  memory_id?: string;

  /** Optional: ID des Review Items (wenn pending) */
  review_id?: number;
}

/**
 * Response fuer Review Item Approval
 */
export interface ApproveReviewResponse {
  /** Erfolgreich? */
  success: boolean;

  /** Optional: Fehlermeldung */
  error?: string;

  /** Optional: ID des erstellten Memory Entries */
  memory_id?: string;
}

// =============================================================================
// Search Types
// =============================================================================

/**
 * Query Parameter fuer Memory Search
 */
export interface MemorySearchParams {
  /** Suchbegriff */
  query: string;

  /** Maximale Anzahl Ergebnisse (default: 10) */
  limit?: number;

  /** Filter nach Quellen */
  sources?: MemorySource[];

  /** Filter nach Kategorien */
  categories?: MemoryCategory[];

  /** Filter nach Company ID */
  company_id?: string;

  /** Filter nach User ID */
  user_id?: string;

  /** Minimaler Score Threshold (0.0 - 1.0) */
  min_score?: number;

  /** Nur Ergebnisse der letzten N Tage */
  days_back?: number;
}

/**
 * Einzelnes Suchergebnis
 */
export interface MemorySearchResult {
  /** Memory Entry ID */
  id: string;

  /** Inhalt/Zusammenfassung */
  summary: string;

  /** Tags */
  tags: string[];

  /** Zeitstempel (ISO 8601) */
  timestamp: string;

  /** Quelle */
  source: MemorySource;

  /** Berechneter Score (relevance * recency * trust) */
  score: number;

  /** Optional: Kategorie */
  category?: MemoryCategory;
}

/**
 * Response von Memory Search
 */
export interface MemorySearchResponse {
  /** Suchergebnisse */
  results: MemorySearchResult[];

  /** Anzahl der Ergebnisse */
  total: number;

  /** Verwendete Suchparameter */
  params: MemorySearchParams;

  /** Suchzeit in Millisekunden */
  search_time_ms?: number;
}

// =============================================================================
// Metrics Types
// =============================================================================

/**
 * Memory System Statistiken
 * Response von GET /v1/memory/metrics
 */
export interface MemoryMetrics {
  /** Episodische Erinnerungen nach Quelle */
  episodic_memories: Record<MemorySource, number>;

  /** Anzahl strukturierter Fakten */
  structured_facts: number;

  /** Anzahl ausstehender Reviews */
  pending_reviews: number;

  /** Lern-Aktivitaet der letzten 7 Tage */
  recent_learns_7d: number;

  /** Memory TTL in Tagen (default: 75) */
  memory_ttl_days: number;

  /** Optional: Tenant ID */
  tenant_id?: string;

  /** Optional: Company ID */
  company_id?: string;

  /** Optional: Fehler wenn Metrics nicht geladen werden konnten */
  error?: string;
}

/**
 * Erweiterte Metrics mit Trend-Daten
 */
export interface MemoryMetricsExtended extends MemoryMetrics {
  /** Trend: Änderung gegenüber Vorwoche (Prozent) */
  trend_learns_7d?: number;

  /** Verteilung nach Kategorien */
  category_distribution?: Record<MemoryCategory, number>;

  /** Durchschnittlicher Confidence Score */
  avg_confidence?: number;

  /** Letzte Cleanup-Zeit (ISO 8601) */
  last_cleanup_at?: string;

  /** Anzahl gelöschter Memories beim letzten Cleanup */
  last_cleanup_count?: number;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Optionen fuer Memory Cleanup (Decay)
 */
export interface MemoryCleanupOptions {
  /** TTL in Tagen (default: 75) */
  ttl_days?: number;

  /** Quellen die vom Cleanup ausgenommen sind */
  protected_sources?: MemorySource[];

  /** Tags die vom Cleanup schuetzen (z.B. 'important') */
  protected_tags?: string[];

  /** Dry-Run Modus (zeigt nur was gelöscht würde) */
  dry_run?: boolean;
}

/**
 * Ergebnis eines Memory Cleanups
 */
export interface MemoryCleanupResult {
  /** Anzahl gelöschter Memories */
  deleted_count: number;

  /** War es ein Dry-Run? */
  dry_run: boolean;

  /** Verwendeter TTL */
  ttl_days: number;

  /** Zeitstempel des Cleanups (ISO 8601) */
  cleaned_at: string;
}

/**
 * Sync Status fuer Core Nodes Integration (Closed Loop V1)
 */
export interface MemorySyncStatus {
  /** Memory ID */
  memory_id: string;

  /** Wurde zu Core Nodes synchronisiert? */
  synced_to_core: boolean;

  /** Core Node ID (wenn synchronisiert) */
  core_node_id?: string;

  /** Sync Zeitstempel (ISO 8601) */
  synced_at?: string;

  /** Fehler beim Sync (wenn fehlgeschlagen) */
  sync_error?: string;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Prueft ob eine Kategorie low-risk ist
 */
export function isLowRiskCategory(category: MemoryCategory): category is LowRiskCategory {
  const lowRisk: LowRiskCategory[] = ['preference', 'tone', 'phrasing', 'summary', 'context'];
  return lowRisk.includes(category as LowRiskCategory);
}

/**
 * Prueft ob eine Kategorie high-risk ist
 */
export function isHighRiskCategory(category: MemoryCategory): category is HighRiskCategory {
  const highRisk: HighRiskCategory[] = ['fact', 'goal', 'price', 'policy', 'team', 'technical'];
  return highRisk.includes(category as HighRiskCategory);
}

/**
 * Ermittelt das Risk Level fuer eine Kategorie
 */
export function getRiskLevel(category: MemoryCategory): RiskLevel {
  return isLowRiskCategory(category) ? 'low' : 'high';
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Alle Low-Risk Kategorien
 */
export const LOW_RISK_CATEGORIES: readonly LowRiskCategory[] = [
  'preference',
  'tone',
  'phrasing',
  'summary',
  'context'
] as const;

/**
 * Alle High-Risk Kategorien
 */
export const HIGH_RISK_CATEGORIES: readonly HighRiskCategory[] = [
  'fact',
  'goal',
  'price',
  'policy',
  'team',
  'technical'
] as const;

/**
 * Alle Memory Kategorien
 */
export const ALL_MEMORY_CATEGORIES: readonly MemoryCategory[] = [
  ...LOW_RISK_CATEGORIES,
  ...HIGH_RISK_CATEGORIES
] as const;

/**
 * Default Memory TTL in Tagen
 */
export const DEFAULT_MEMORY_TTL_DAYS = 75;

/**
 * Default Confidence Scores nach Quelle
 */
export const DEFAULT_CONFIDENCE_SCORES: Record<MemorySource, number> = {
  voice_learn: 0.95,
  manual: 1.0,
  voice_auto: 0.7,
  system: 0.8,
  import: 0.6
} as const;
