import { useNavStore } from '@/lib/store/navStore';

beforeEach(() => {
  useNavStore.setState({
    viewLevel: 'core',
    coreMode: 'home',
    viewMode: 'workspace',
    activeCompanyId: null,
    activeDepartmentId: null,
    activeSpaceId: null,
    activeFolderId: null,
    isStandardMode: false,
    nameConflict: null,
    departmentEntryOrigin: null,
  });
});

describe('navStore', () => {
  it('navigateToCore resets department/space/folder ids', () => {
    useNavStore.getState().setActiveDepartment('d1');
    useNavStore.getState().navigateToCore();
    const { viewLevel, coreMode, activeDepartmentId } = useNavStore.getState();
    expect(viewLevel).toBe('core');
    expect(coreMode).toBe('home');
    expect(activeDepartmentId).toBeNull();
  });

  it('navigateToExplore sets coreMode to explore', () => {
    useNavStore.getState().navigateToExplore();
    expect(useNavStore.getState().coreMode).toBe('explore');
    expect(useNavStore.getState().viewLevel).toBe('core');
  });

  it('navigateToDepartment sets viewLevel and departmentId', () => {
    useNavStore.getState().navigateToDepartment('d1');
    const { viewLevel, activeDepartmentId, activeSpaceId } = useNavStore.getState();
    expect(viewLevel).toBe('department');
    expect(activeDepartmentId).toBe('d1');
    expect(activeSpaceId).toBeNull();
  });

  it('setActiveCompany clears department/space/folder and resets coreMode', () => {
    useNavStore.getState().setActiveDepartment('d1');
    useNavStore.getState().setActiveSpace('s1');
    useNavStore.getState().setActiveCompany('c1');
    const state = useNavStore.getState();
    expect(state.activeCompanyId).toBe('c1');
    expect(state.activeDepartmentId).toBeNull();
    expect(state.activeSpaceId).toBeNull();
    expect(state.coreMode).toBe('home');
  });

  it('navigateToDepartment records the planet zoom origin when provided', () => {
    useNavStore.getState().navigateToDepartment('d1', { x: 12, y: 34 });
    expect(useNavStore.getState().departmentEntryOrigin).toEqual({ x: 12, y: 34 });
  });

  it('navigateToDepartment preserves the prior origin when none is provided', () => {
    useNavStore.getState().navigateToDepartment('d1', { x: 12, y: 34 });
    useNavStore.getState().navigateToDepartment('d2');
    expect(useNavStore.getState().departmentEntryOrigin).toEqual({ x: 12, y: 34 });
  });

  it('setDepartmentEntryOrigin can clear the origin', () => {
    useNavStore.getState().navigateToDepartment('d1', { x: 12, y: 34 });
    useNavStore.getState().setDepartmentEntryOrigin(null);
    expect(useNavStore.getState().departmentEntryOrigin).toBeNull();
  });

  it('cancelNameConflict clears nameConflict', () => {
    useNavStore.setState({
      nameConflict: { type: 'space', message: 'exists', suggestions: ['alt'], originalPayload: {} }
    });
    useNavStore.getState().cancelNameConflict();
    expect(useNavStore.getState().nameConflict).toBeNull();
  });
});
