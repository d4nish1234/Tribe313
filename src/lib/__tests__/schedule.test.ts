import { backToBackDays, dayOfWorkout, normalizeDays, pickingHint, toggleDay, weekSchedule } from '../schedule';

const W = ['Leg Day', 'Upper Body Day', 'Grip & Cardio Day'];

describe('normalizeDays', () => {
  it('drops junk and duplicates and sorts Monday first', () => {
    expect(normalizeDays([0, 5, 1, 1, 7, -1, 2.5, 'x'])).toEqual([1, 5, 0]);
    expect(normalizeDays(null)).toEqual([]);
  });
});

describe('toggleDay', () => {
  it('adds and removes days', () => {
    expect(toggleDay([], 3)).toEqual({ days: [3], full: false });
    expect(toggleDay([1, 3], 3)).toEqual({ days: [1], full: false });
  });
  it('refuses a 4th day instead of dropping one', () => {
    expect(toggleDay([1, 3, 5], 6)).toEqual({ days: [1, 3, 5], full: true });
    expect(toggleDay([1, 3, 5], 5)).toEqual({ days: [1, 3], full: false });
  });
});

describe('weekSchedule', () => {
  it('gives the workouts to the picked days in week order, Monday first', () => {
    const s = weekSchedule([5, 1, 3], W);
    expect([...s.entries()]).toEqual([
      [1, 'Leg Day'],
      [3, 'Upper Body Day'],
      [5, 'Grip & Cardio Day'],
    ]);
  });
  it('puts Sunday last in the week', () => {
    expect(weekSchedule([0, 2, 4], W).get(0)).toBe('Grip & Cardio Day');
    expect(weekSchedule([0, 2, 4], W).get(2)).toBe('Leg Day');
  });
  it('is empty until exactly 3 days are picked', () => {
    expect(weekSchedule([1, 3], W).size).toBe(0);
    expect(weekSchedule([], W).size).toBe(0);
  });
});

describe('backToBackDays', () => {
  it('finds days with no rest between, including Sunday into Monday', () => {
    expect(backToBackDays([1, 3, 5])).toEqual([]);
    expect(backToBackDays([1, 2, 5])).toEqual([[1, 2]]);
    expect(backToBackDays([0, 1, 4])).toEqual([[0, 1]]);
    // Friday, Saturday, Sunday: Fri→Sat and Sat→Sun, in week order.
    expect(backToBackDays([5, 6, 0])).toEqual([
      [5, 6],
      [6, 0],
    ]);
  });
});

describe('dayOfWorkout', () => {
  it('maps each workout to its weekday once 3 days are picked', () => {
    expect([...dayOfWorkout([5, 1, 3], W)]).toEqual([
      ['Leg Day', 1],
      ['Upper Body Day', 3],
      ['Grip & Cardio Day', 5],
    ]);
    expect(dayOfWorkout([1], W).size).toBe(0);
  });
});

describe('pickingHint', () => {
  it('counts the days still to pick, then warns about back-to-back days', () => {
    expect(pickingHint([])).toBe('Pick 3 more days.');
    expect(pickingHint([1, 3])).toBe('Pick 1 more day.');
    expect(pickingHint([1, 3, 5])).toBeNull();
    expect(pickingHint([1, 2, 5])).toMatch(/^Mon and Tue are back to back/);
  });
});
