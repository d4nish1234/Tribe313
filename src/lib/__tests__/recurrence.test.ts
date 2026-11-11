import {
  addDays,
  dateIn,
  defaultMonthlyWeek,
  describeRepeat,
  formatTimeOfDay,
  isLastWeekdayOfMonth,
  occurrenceDates,
  planSync,
  timeIn,
  upcomingOccurrences,
  weekdayName,
  zonedTime,
  type SeriesRule,
} from '../recurrence';

const rule = (r: Partial<SeriesRule>): SeriesRule => ({
  repeat: 'weekly',
  startDate: '2026-11-07', // a Saturday
  timeOfDay: '08:00',
  ...r,
});

describe('calendar dates', () => {
  it('adds days across months and years', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29'); // leap year
  });

  it('names weekdays', () => {
    expect(weekdayName('2026-11-07')).toBe('Saturday');
    expect(weekdayName('2026-11-11')).toBe('Wednesday');
  });

  it('knows the last weekday of a month', () => {
    expect(isLastWeekdayOfMonth('2026-11-28')).toBe(true);
    expect(isLastWeekdayOfMonth('2026-11-21')).toBe(false);
    expect(defaultMonthlyWeek('2026-10-31')).toBe(-1); // 5th Saturday -> last
    expect(defaultMonthlyWeek('2026-11-14')).toBe(2);
  });
});

describe('occurrenceDates', () => {
  it('weekly, from the start date on', () => {
    expect(occurrenceDates(rule({}), '2026-11-01', '2026-11-30')).toEqual([
      '2026-11-07',
      '2026-11-14',
      '2026-11-21',
      '2026-11-28',
    ]);
  });

  it('weekly, picking up mid-series on the right weekday', () => {
    expect(occurrenceDates(rule({}), '2026-11-15', '2026-11-29')).toEqual(['2026-11-21', '2026-11-28']);
  });

  it('every 2 weeks stays on the start date’s rhythm', () => {
    expect(occurrenceDates(rule({ repeat: 'biweekly' }), '2026-11-10', '2026-12-31')).toEqual([
      '2026-11-21',
      '2026-12-05',
      '2026-12-19',
    ]);
  });

  it('monthly on the 2nd Saturday', () => {
    const r = rule({ repeat: 'monthly', startDate: '2026-11-14', monthlyWeek: 2 });
    expect(occurrenceDates(r, '2026-11-01', '2027-02-28')).toEqual([
      '2026-11-14',
      '2026-12-12',
      '2027-01-09',
      '2027-02-13',
    ]);
  });

  it('monthly on the last Saturday', () => {
    const r = rule({ repeat: 'monthly', startDate: '2026-11-28', monthlyWeek: -1 });
    expect(occurrenceDates(r, '2026-11-01', '2027-01-31')).toEqual([
      '2026-11-28',
      '2026-12-26',
      '2027-01-30',
    ]);
  });

  it('respects the end date and skipped dates', () => {
    const r = rule({ endDate: '2026-11-21', skipDates: ['2026-11-14'] });
    expect(occurrenceDates(r, '2026-11-01', '2026-12-31')).toEqual(['2026-11-07', '2026-11-21']);
  });

  it('nothing before the start or after the end', () => {
    expect(occurrenceDates(rule({ startDate: '2027-01-02' }), '2026-11-01', '2026-12-31')).toEqual([]);
    expect(occurrenceDates(rule({ endDate: '2026-10-01' }), '2026-11-01', '2026-12-31')).toEqual([]);
  });
});

describe('Toronto time', () => {
  it('keeps 8:00 AM on the wall clock across the November clock change', () => {
    // EDT (UTC-4) before Nov 1 2026, EST (UTC-5) after.
    expect(new Date(zonedTime('2026-10-31', '08:00')).toISOString()).toBe('2026-10-31T12:00:00.000Z');
    expect(new Date(zonedTime('2026-11-07', '08:00')).toISOString()).toBe('2026-11-07T13:00:00.000Z');
  });

  it('and across the March clock change', () => {
    expect(new Date(zonedTime('2027-03-13', '08:00')).toISOString()).toBe('2027-03-13T13:00:00.000Z');
    expect(new Date(zonedTime('2027-03-14', '08:00')).toISOString()).toBe('2027-03-14T12:00:00.000Z');
  });

  it('reads the date and time back', () => {
    const ms = zonedTime('2026-11-28', '19:30');
    expect(dateIn(ms)).toBe('2026-11-28');
    expect(timeIn(ms)).toBe('19:30');
    // 11 PM in Toronto is already the next day in UTC.
    expect(dateIn(Date.parse('2026-11-29T04:00:00Z'))).toBe('2026-11-28');
  });
});

describe('upcomingOccurrences', () => {
  it('covers the next 5 weeks and drops one that already started today', () => {
    const now = zonedTime('2026-11-07', '09:00'); // after this Saturday's 8 AM
    const got = upcomingOccurrences(rule({}), now).map((o) => o.date);
    expect(got).toEqual(['2026-11-14', '2026-11-21', '2026-11-28', '2026-12-05', '2026-12-12']);
  });

  it('includes today when it hasn’t started yet', () => {
    const now = zonedTime('2026-11-07', '07:00');
    expect(upcomingOccurrences(rule({}), now)[0].date).toBe('2026-11-07');
  });
});

describe('planSync', () => {
  const wanted = [
    { date: '2026-11-14', startsAt: 1 },
    { date: '2026-11-21', startsAt: 2 },
  ];

  it('creates missing dates, updates kept ones, removes ones that no longer fit', () => {
    const plan = planSync(wanted, [
      { id: 's_2026-11-14', date: '2026-11-14' },
      { id: 's_2026-11-15', date: '2026-11-15' },
    ]);
    expect(plan.create.map((o) => o.date)).toEqual(['2026-11-21']);
    expect(plan.update).toEqual([{ id: 's_2026-11-14', date: '2026-11-14', startsAt: 1 }]);
    expect(plan.remove).toEqual(['s_2026-11-15']);
  });

  it('does nothing new when everything is in place', () => {
    const plan = planSync(
      wanted,
      wanted.map((o) => ({ id: `s_${o.date}`, date: o.date })),
    );
    expect(plan.create).toEqual([]);
    expect(plan.remove).toEqual([]);
  });
});

describe('wording', () => {
  it('describes each repeat', () => {
    expect(describeRepeat(rule({}))).toBe('Every Saturday');
    expect(describeRepeat(rule({ repeat: 'biweekly' }))).toBe('Every 2 weeks on Saturday');
    expect(describeRepeat(rule({ repeat: 'monthly', startDate: '2026-11-14' }))).toBe(
      'Monthly on the second Saturday',
    );
    expect(describeRepeat(rule({ repeat: 'monthly', startDate: '2026-11-28', monthlyWeek: -1 }))).toBe(
      'Monthly on the last Saturday',
    );
  });

  it('formats times', () => {
    expect(formatTimeOfDay('08:00')).toBe('8:00 AM');
    expect(formatTimeOfDay('00:15')).toBe('12:15 AM');
    expect(formatTimeOfDay('12:00')).toBe('12:00 PM');
    expect(formatTimeOfDay('19:30')).toBe('7:30 PM');
  });
});
