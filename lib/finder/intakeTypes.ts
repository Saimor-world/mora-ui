/**
 * Shared guided-intake summary types used by both the Finder and Scanner
 * surfaces. Previously declared identically in both monoliths.
 */

export interface FileIntakeDestinationSummary {
    company_name?: string;
    department_name?: string;
    space_name?: string;
    folder_name?: string;
    label?: string;
}

export interface FileIntakeRouteDecision {
    mode?: 'accepted' | 'changed' | 'rejected' | string;
    label?: string;
    message?: string;
    suggested_destination?: FileIntakeDestinationSummary;
    selected_destination?: FileIntakeDestinationSummary;
}
