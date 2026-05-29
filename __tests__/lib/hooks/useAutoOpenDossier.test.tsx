import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useAutoOpenDossier } from '@/lib/hooks/useAutoOpenDossier';
import { usePaneStore } from '@/lib/store/paneStore';

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: jest.fn(),
}));

const mockOpenPane = jest.fn();

const mockContext = {
    id: 'ctx-auto-1',
    companyName: 'Acme GmbH',
    domain: 'acme.de',
    score: 62,
    title: 'Test',
    rooms: [],
    documents: [],
    tasks: [{ title: 'SSL erneuern', priority: 'hoch' as const }],
    storedAt: new Date().toISOString(),
};

beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    jest.useFakeTimers();
    (usePaneStore as unknown as jest.Mock).mockImplementation((selector?: any) => {
        const store = { openPane: mockOpenPane };
        return selector ? selector(store) : store;
    });
});

afterEach(() => {
    jest.useRealTimers();
});

it('does not open pane when context is null', () => {
    renderHook(() => useAutoOpenDossier(null, 'node-123'));
    act(() => jest.runAllTimers());
    expect(mockOpenPane).not.toHaveBeenCalled();
});

it('does not open pane when nodeId is null', () => {
    renderHook(() => useAutoOpenDossier(mockContext, null));
    act(() => jest.runAllTimers());
    expect(mockOpenPane).not.toHaveBeenCalled();
});

it('opens dossier pane after 800ms with nodeId', () => {
    renderHook(() => useAutoOpenDossier(mockContext, 'node-abc'));
    act(() => jest.advanceTimersByTime(800));
    expect(mockOpenPane).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'dossier-main', type: 'document', data: { nodeId: 'node-abc' } })
    );
});

it('opens chat pane after 1400ms with initialMessage', () => {
    renderHook(() => useAutoOpenDossier(mockContext, 'node-abc'));
    act(() => jest.advanceTimersByTime(1400));
    expect(mockOpenPane).toHaveBeenCalledWith(
        expect.objectContaining({
            id: 'chat-main',
            type: 'chat',
            data: expect.objectContaining({ initialMessage: expect.stringContaining('acme.de') }),
        })
    );
});

it('does not fire again if already opened (localStorage flag)', () => {
    localStorage.setItem('saimor_dossier_auto_opened_ctx-auto-1', '1');
    renderHook(() => useAutoOpenDossier(mockContext, 'node-abc'));
    act(() => jest.runAllTimers());
    expect(mockOpenPane).not.toHaveBeenCalled();
});
