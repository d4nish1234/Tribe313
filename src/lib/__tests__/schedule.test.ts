import { backToBackDays, monthWeeks, normalizeDays, sameDay, toggleDay, weekSchedule } from '../schedule';

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

describe('monthWeeks', () => {
  it('lays out a month Monday first with blanks outside it', () => {
    // November 2026 starts on a Sunday and has 30 days.
    const weeks = monthWeeks(2026, 10);
    expect(weeks[0].slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(weeks[0][6]!.getDate()).toBe(1);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
    weeks.forEach((w) => expect(w).toHaveLength(7));
    expect(weeks[weeks.length - 1][0]!.getDate()).toBe(30);
  });
  it('starts on the first column when the 1st is a Monday', () => {
    // June 2026 starts on a Monday.
    expect(monthWeeks(2026, 5)[0][0]!.getDate()).toBe(1);
  });
});

describe('sameDay', () => {
  it('ignores the time of day', () => {
    expect(sameDay(new Date(2026, 10, 20, 1), new Date(2026, 10, 20, 23))).toBe(true);
    expect(sameDay(new Date(2026, 10, 20), new Date(2026, 10, 21))).toBe(false);
  });
});
