'use client';

import React, { useState } from 'react';
import { updateDepartmentVisibility } from '@/lib/api/coreClient';
import { useNavStore } from '@/lib/store/navStore';
import { useQueryClient } from '@tanstack/react-query';
import { useDepartments } from '@/lib/queries/useDepartments';
import { queryKeys } from '@/lib/queries/queryKeys';

type Visibility = 'public' | 'visible' | 'private';

/**
 * DepartmentVisibilityEditor -- set Public / Visible / Private per department.
 * Spec (Section 4 -- Department Classification).
 * Default for new departments: Private.
 */
export const DepartmentVisibilityEditor: React.FC = () => {
    const { activeCompanyId } = useNavStore();
    const queryClient = useQueryClient();
    const { data: departments = [] } = useDepartments(activeCompanyId);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState<Record<string, boolean>>({});

    const handleChange = async (deptId: string, visibility: Visibility) => {
        setSaving((prev) => ({ ...prev, [deptId]: true }));
        setErrors((prev) => ({ ...prev, [deptId]: '' }));

        const result = await updateDepartmentVisibility(deptId, visibility);

        setSaving((prev) => ({ ...prev, [deptId]: false }));
        if (!result) {
            setErrors((prev) => ({ ...prev, [deptId]: 'Speichern fehlgeschlagen.' }));
            return;
        }
        await queryClient.invalidateQueries({ queryKey: queryKeys.departments(activeCompanyId) });
    };

    if (departments.length === 0) {
        return <div className="text-sm text-white/30 py-4">Keine Abteilungen verfügbar.</div>;
    }

    return (
        <div className="flex flex-col gap-3">
            <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">
                Abteilungs-Sichtbarkeit
            </h3>
            {departments.map((dept) => (
                <div key={dept.id} className="flex items-center gap-4">
                    <span className="text-sm text-white/70 w-32 shrink-0">{dept.name}</span>
                    <select
                        value={(dept.visibility as Visibility) ?? 'private'}
                        onChange={(e) => handleChange(dept.id, e.target.value as Visibility)}
                        disabled={saving[dept.id]}
                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/60 focus:outline-none focus:border-white/20 disabled:opacity-50"
                        aria-label={`Sichtbarkeit für ${dept.name}`}
                    >
                        <option value="public">Öffentlich</option>
                        <option value="visible">Sichtbar</option>
                        <option value="private">Privat</option>
                    </select>
                    {errors[dept.id] && (
                        <span className="text-xs text-red-400">{errors[dept.id]}</span>
                    )}
                </div>
            ))}
            <p className="text-[10px] text-white/20 mt-1">
                Öffentlich: alle lesen | Sichtbar: Planet sichtbar, Inhalt geschützt | Privat: nur Mitglieder
            </p>
        </div>
    );
};
