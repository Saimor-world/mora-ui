/**
 * Browser cache partition for CORE read responses. Cache segregation is not an
 * authorization mechanism and does not assert that CORE connectors are scoped
 * to the selected company (CORE #100 remains open).
 */
export type OsReadScope = {
  tenantId: string | null;
  userId: string | null;
  sessionGeneration: number;
  companyId: string | null;
};

export function osReadKey(area: 'mail-summary' | 'briefing', scope: OsReadScope) {
  return [
    'os',
    area,
    scope.tenantId,
    scope.userId,
    scope.sessionGeneration,
    scope.companyId,
  ] as const;
}
