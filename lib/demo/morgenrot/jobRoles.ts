/** Fachrollen (Job-Rollen) – ergänzen die System-Rollen aus lib/auth/roles.ts, ersetzen sie nicht. */
export type JobRoleId = 'inhaber' | 'service' | 'kueche' | 'aushilfe';

export interface JobRole {
  id: JobRoleId;
  label: string;
  focus: string;
}

export const JOB_ROLES: Record<JobRoleId, JobRole> = {
  inhaber: { id: 'inhaber', label: 'Inhaber', focus: 'Freigaben, Zahlen, Team' },
  service: { id: 'service', label: 'Service', focus: 'Gäste, Kasse, Reservierungen' },
  kueche: { id: 'kueche', label: 'Küche', focus: 'Mise en place, Bestand, Bestellungen' },
  aushilfe: { id: 'aushilfe', label: 'Aushilfe', focus: 'Theke, Abräumen, Spülen' },
};
