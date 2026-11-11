import { choiceFromSeries, dateKey, fitChoice, repeatChoices, ruleFromForm, timeKey } from '../seriesForm';

const at = (y: number, m: number, d: number, h = 8, min = 0) => new Date(y, m - 1, d, h, min);

describe('repeatChoices', () => {
  it('a mid-month date offers weekly, every 2 weeks and its week of the month', () => {
    expect(repeatChoices(at(2026, 11, 14)).map((c) => c.label)).toEqual([
      'Every Saturday',
      'Every 2 weeks on Saturday',
      'Monthly on the second Saturday',
    ]);
  });

  it('a date in the last week also offers "last"', () => {
    expect(repeatChoices(at(2026, 11, 28)).map((c) => c.id)).toEqual([
      'weekly',
      'biweekly',
      'monthly',
      'monthly-last',
    ]);
  });

  it('a 5th weekday can only be "last"', () => {
    const ids = repeatChoices(at(2026, 10, 31)).map((c) => c.id);
    expect(ids).toContain('monthly-last');
    expect(ids).not.toContain('monthly');
  });
});

describe('ruleFromForm', () => {
  it('reads the date and time off the picker’s clock', () => {
    const d = at(2026, 1, 3, 19, 5);
    expect(dateKey(d)).toBe('2026-01-03');
    expect(timeKey(d)).toBe('19:05');
  });

  it('builds each kind of rule', () => {
    const start = at(2026, 11, 28, 8, 30);
    expect(ruleFromForm({ start, choice: 'weekly', end: null })).toMatchObject({
      repeat: 'weekly',
      startDate: '2026-11-28',
      timeOfDay: '08:30',
      monthlyWeek: null,
      endDate: null,
    });
    expect(ruleFromForm({ start, choice: 'monthly', end: null }).monthlyWeek).toBe(4);
    expect(ruleFromForm({ start, choice: 'monthly-last', end: at(2027, 3, 1) })).toMatchObject({
      repeat: 'monthly',
      monthlyWeek: -1,
      endDate: '2027-03-01',
    });
  });

  it('round-trips the choice', () => {
    expect(choiceFromSeries({ repeat: 'biweekly', monthlyWeek: null })).toBe('biweekly');
    expect(choiceFromSeries({ repeat: 'monthly', monthlyWeek: -1 })).toBe('monthly-last');
    expect(choiceFromSeries({ repeat: 'monthly', monthlyWeek: 2 })).toBe('monthly');
  });
});

describe('fitChoice', () => {
  it('keeps a choice the date allows', () => {
    expect(fitChoice('monthly-last', repeatChoices(at(2026, 11, 28)))).toBe('monthly-last');
  });
  it('swaps a monthly choice the new date rules out', () => {
    expect(fitChoice('monthly-last', repeatChoices(at(2026, 11, 14)))).toBe('monthly');
    expect(fitChoice('monthly', repeatChoices(at(2026, 10, 31)))).toBe('monthly-last');
  });
});
