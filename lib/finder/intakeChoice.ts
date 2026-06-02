import { toOpenableSearchResult, type OpenableSearchResult } from '@/lib/utils/searchOpen';
import type { FileIntakeRouteCandidate } from '@/lib/api/filesClient';

/**
 * A guided-intake route candidate rendered as an openable search result, plus
 * the route metadata (destination, explanation, confidence). Shared by Finder
 * and Scanner — previously duplicated verbatim in both monoliths.
 */
export interface IntakeChoiceResult extends OpenableSearchResult {
    route_destination?: {
        company_name?: string;
        department_name?: string;
        space_name?: string;
        folder_name?: string;
        label?: string;
    };
    route_explanation?: {
        headline?: string;
        reason?: string;
        signal_labels?: string[];
        learning_summary?: string;
    };
    route_reason?: string;
    route_signals?: string[];
    route_confidence_label?: string;
    route_confidence_score?: number;
}

/**
 * Maps a route candidate into an IntakeChoiceResult. `fallbackIdPrefix` keeps
 * each caller's original fallback id namespace (Finder used "finder-intake-choice",
 * Scanner used "intake-choice").
 */
export function toIntakeChoiceResult(
    candidate: FileIntakeRouteCandidate,
    fallbackIndex: number,
    fallbackIdPrefix = 'intake-choice',
): IntakeChoiceResult {
    const folderId = candidate.target_folder_id || candidate.destination?.folder_id;
    const base = toOpenableSearchResult({
        id: folderId || candidate.target_space_id || candidate.target_department_id || `${fallbackIdPrefix}-${fallbackIndex}`,
        title: candidate.label || candidate.target_folder_name || candidate.suggested_location || 'Ziel',
        type: folderId ? 'folder' : candidate.target_space_id ? 'space' : candidate.target_department_id ? 'department' : 'folder',
        scope_path: candidate.label || candidate.suggested_location,
        path: candidate.label || candidate.suggested_location,
        company_id: candidate.target_company_id || candidate.destination?.company_id,
        department_id: candidate.target_department_id || candidate.destination?.department_id,
        space_id: candidate.target_space_id || candidate.destination?.space_id,
        folder_id: folderId,
        score: candidate.route_confidence_score,
    });
    return {
        ...base,
        route_destination: candidate.destination || undefined,
        route_explanation: candidate.route_explanation || undefined,
        route_reason: candidate.route_reason,
        route_signals: candidate.route_signals,
        route_confidence_label: candidate.route_confidence_label,
        route_confidence_score: candidate.route_confidence_score,
    };
}
