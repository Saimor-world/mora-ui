/** Selected-company context is explicit on provider reads and writes. */
export function companyPath(path: string, companyId: string | null): string {
  return companyId ? `${path}${path.includes('?') ? '&' : '?'}company_id=${encodeURIComponent(companyId)}` : path;
}
