import { renderHook, act } from '@testing-library/react';
import { useCalendarEvents } from '@/apps/calendar/hooks/useCalendarEvents';

jest.mock('@/lib/api/coreClient', () => ({
  coreGet: jest.fn(),
  corePost: jest.fn(),
}));
import { coreGet, corePost } from '@/lib/api/coreClient';
const mockGet = coreGet as jest.Mock;
const mockPost = corePost as jest.Mock;

describe('useCalendarEvents', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts with empty events and isLoading true', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useCalendarEvents());
    expect(result.current.events).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('loads events on mount', async () => {
    const fakeEvents = [{ id: '1', title: 'Meeting', date: '2026-04-06' }];
    mockGet.mockResolvedValue(fakeEvents);
    const { result } = renderHook(() => useCalendarEvents());
    await act(async () => {});
    expect(result.current.events).toEqual(fakeEvents);
    expect(result.current.isLoading).toBe(false);
  });

  it('addEvent posts and optimistically updates events list', async () => {
    mockGet.mockResolvedValue([]);
    mockPost.mockResolvedValue({ id: 'new-1', title: 'New Event', date: '2026-04-10' });
    const { result } = renderHook(() => useCalendarEvents());
    await act(async () => {});

    await act(async () => {
      await result.current.addEvent('New Event', '2026-04-10');
    });

    expect(mockPost).toHaveBeenCalledWith('/v3/calendar/events', expect.objectContaining({ title: 'New Event' }));
    expect(result.current.events.some(e => e.title === 'New Event')).toBe(true);
  });
});
