import { resilient } from '../live';

jest.mock('firebase/firestore', () => ({ onSnapshot: jest.fn() }));

/** A fake listener we can make succeed or fail on demand. */
function fakeSubscribe() {
  const calls: { ok: () => void; fail: (e: any) => void; unsub: jest.Mock }[] = [];
  const subscribe = (ok: () => void, fail: (e: any) => void) => {
    const unsub = jest.fn();
    calls.push({ ok, fail, unsub });
    return unsub;
  };
  return { calls, subscribe };
}

describe('resilient', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  const err = { code: 'unavailable' };

  it('re-subscribes after an error with growing delays (1s, 2s, 4s)', () => {
    const { calls, subscribe } = fakeSubscribe();
    const onFail = jest.fn();
    resilient(subscribe, onFail);
    expect(calls).toHaveLength(1);

    calls[0].fail(err);
    expect(onFail).toHaveBeenCalledTimes(1);
    expect(calls[0].unsub).toHaveBeenCalled();
    jest.advanceTimersByTime(999);
    expect(calls).toHaveLength(1);
    jest.advanceTimersByTime(1);
    expect(calls).toHaveLength(2);

    calls[1].fail(err);
    jest.advanceTimersByTime(1999);
    expect(calls).toHaveLength(2);
    jest.advanceTimersByTime(1);
    expect(calls).toHaveLength(3);
  });

  it('resets the delay once data arrives again', () => {
    const { calls, subscribe } = fakeSubscribe();
    resilient(subscribe);
    calls[0].fail(err);
    jest.advanceTimersByTime(1000);
    calls[1].fail(err);
    jest.advanceTimersByTime(2000);
    calls[2].ok(); // recovered
    calls[2].fail(err);
    jest.advanceTimersByTime(1000);
    expect(calls).toHaveLength(4);
  });

  it('caps the delay at 30s', () => {
    const { calls, subscribe } = fakeSubscribe();
    resilient(subscribe);
    for (let i = 0; i < 8; i++) {
      calls[calls.length - 1].fail(err);
      jest.advanceTimersByTime(30_000);
    }
    expect(calls).toHaveLength(9);
  });

  it('stops for good when unsubscribed, including a pending retry', () => {
    const { calls, subscribe } = fakeSubscribe();
    const stop = resilient(subscribe);
    calls[0].fail(err);
    stop();
    jest.advanceTimersByTime(60_000);
    expect(calls).toHaveLength(1);
  });
});
