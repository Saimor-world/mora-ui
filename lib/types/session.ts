// lib/types/session.ts
// Shared session-level types — imported by both the API layer and the store.
// Must have ZERO imports from lib/api or lib/store to avoid circular dependencies.

export type OperationalState = 'operational' | 'setup_required';
