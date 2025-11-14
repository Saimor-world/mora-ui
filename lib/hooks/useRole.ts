import { useShallow } from 'zustand/react/shallow';
import { useSessionStore } from '@/store/session';
import { ROLE_DEFINITIONS, type RoleKey } from '@/lib/roles';

export function useRole() {
  const { role, setRole } = useSessionStore(
    useShallow((state) => ({
      role: state.activeRole,
      setRole: state.setActiveRole,
    }))
  );

  const definition = ROLE_DEFINITIONS[role] ?? ROLE_DEFINITIONS.owner;

  return {
    role,
    setRole,
    definition,
  };
}

export function useRoleDefinition(role: RoleKey) {
  return ROLE_DEFINITIONS[role] ?? ROLE_DEFINITIONS.owner;
}
