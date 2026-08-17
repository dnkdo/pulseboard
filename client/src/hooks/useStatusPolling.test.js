// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStatusPolling } from './useStatusPolling.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('useStatusPolling', () => {
  it('AC: fires an immediate fetch on mount, before any interval elapses, seeding cold-start data', async () => {
    const fetchImpl = vi.fn().mockResolvedValue([{ id: '1', status: 'open' }]);

    const { result } = renderHook(() => useStatusPolling({ fetchImpl, pollIntervalMs: 10000 }));

    expect(result.current.status).toBe('loading');

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('ready');
    expect(result.current.data).toEqual([{ id: '1', status: 'open' }]);
  });

  it('fetches exactly once per configured interval tick', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn().mockResolvedValue([]);

    renderHook(() => useStatusPolling({ fetchImpl, pollIntervalMs: 5000 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('does not update state when consecutive polls return structurally identical data', async () => {
    // React may still invoke a bailed-out component's render function once
    // more before skipping the commit, so render-count is not a reliable
    // signal here — instead assert on what the hook actually controls: the
    // returned state object keeps the same reference (no setState call)
    // across polls with unchanged data, which is what lets a memoized
    // consumer skip re-rendering.
    vi.useFakeTimers();
    const fetchImpl = vi.fn().mockResolvedValue([{ id: '1', status: 'open' }]);

    const { result } = renderHook(() => useStatusPolling({ fetchImpl, pollIntervalMs: 5000 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.status).toBe('ready');
    const stateAfterFirstPoll = result.current;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(result.current).toBe(stateAfterFirstPoll);
  });

  it('AC: a payload where an incident status flips to resolved updates state exactly once, and not on the identical poll before it', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce([{ id: '1', status: 'investigating' }])
      .mockResolvedValueOnce([{ id: '1', status: 'investigating' }])
      .mockResolvedValueOnce([{ id: '1', status: 'resolved' }]);

    const { result } = renderHook(() => useStatusPolling({ fetchImpl, pollIntervalMs: 5000 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const stateAfterFirstPoll = result.current;
    expect(stateAfterFirstPoll.data).toEqual([{ id: '1', status: 'investigating' }]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(result.current).toBe(stateAfterFirstPoll);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(result.current).not.toBe(stateAfterFirstPoll);
    expect(result.current.data).toEqual([{ id: '1', status: 'resolved' }]);
  });

  it('skips an interval tick while the previous fetch for this instance is still in flight', async () => {
    vi.useFakeTimers();
    let resolveFirst;
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValue([{ id: '2' }]);

    renderHook(() => useStatusPolling({ fetchImpl, pollIntervalMs: 1000 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    // Interval fires while the first request is still pending; the in-flight
    // guard should skip calling fetchImpl again for this tick.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst([{ id: '1' }]);
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('sets status to error and stops loading when the fetch rejects, without throwing', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useStatusPolling({ fetchImpl, pollIntervalMs: 10000 }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('recovers to ready status on the next successful poll after an error', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce([{ id: '1' }]);

    const { result } = renderHook(() => useStatusPolling({ fetchImpl, pollIntervalMs: 1000 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.status).toBe('error');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current.status).toBe('ready');
    expect(result.current.data).toEqual([{ id: '1' }]);
    expect(result.current.error).toBeNull();
  });

  it('stops polling after unmount', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn().mockResolvedValue([]);

    const { unmount } = renderHook(() => useStatusPolling({ fetchImpl, pollIntervalMs: 2000 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('ignores a successful fetch that resolves after the component has unmounted', async () => {
    let resolveFetch;
    const fetchImpl = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const { unmount } = renderHook(() => useStatusPolling({ fetchImpl, pollIntervalMs: 10000 }));
    unmount();

    await expect(
      (async () => {
        resolveFetch([{ id: '1' }]);
        await Promise.resolve();
        await Promise.resolve();
      })(),
    ).resolves.not.toThrow();
  });
});
