// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useIncidentPolling } from './useIncidentPolling.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('useIncidentPolling', () => {
  it('returns the active incidents from the first successful poll, filtered and sorted', async () => {
    const fetchImpl = vi.fn().mockResolvedValue([
      { id: '1', status: 'resolved', severity: 'SEV1' },
      { id: '2', status: 'open', severity: 'SEV3' },
      { id: '3', status: 'investigating', severity: 'SEV1' },
    ]);

    const { result } = renderHook(() => useIncidentPolling({ fetchImpl }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.activeIncidents.map((incident) => incident.id)).toEqual(['3', '2']);
  });

  it('AC: drops a card from activeIncidents on the next poll tick once its status flips to resolved, with no manual action', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce([{ id: '1', status: 'open', severity: 'SEV1', title: 'API Down' }])
      .mockResolvedValueOnce([{ id: '1', status: 'resolved', severity: 'SEV1', title: 'API Down' }]);

    const { result } = renderHook(() => useIncidentPolling({ pollIntervalMs: 10000, fetchImpl }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.activeIncidents).toHaveLength(1);
    expect(result.current.activeIncidents[0].id).toBe('1');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.current.activeIncidents).toEqual([]);
  });

  it('sets an error and stops loading when the fetch rejects, without throwing', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useIncidentPolling({ fetchImpl }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.activeIncidents).toEqual([]);
  });

  it('stops polling after unmount', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn().mockResolvedValue([]);

    const { unmount } = renderHook(() => useIncidentPolling({ pollIntervalMs: 5000, fetchImpl }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
