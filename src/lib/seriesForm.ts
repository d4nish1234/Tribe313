import {
  defaultMonthlyWeek,
  describeRepeat,
  isLastWeekdayOfMonth,
  weekOfMonth,
  type SeriesRule,
} from './recurrence';

/**
 * The recurring-event form's "Repeats" options. Monthly is "the same weekday
 * each month": the 2nd Saturday, say. A date in the last week of its month can
 * also mean "the last Saturday"; a 5th Saturday can only mean that.
 */
export type RepeatChoice = 'weekly' | 'biweekly' | 'monthly' | 'monthly-last';

/** 'YYYY-MM-DD' and 'HH:mm' from a Date's own clock (the pickers' device time, read as Toronto time). */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function timeKey(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function repeatChoices(start: Date): { id: RepeatChoice; label: string }[] {
  const startDate = dateKey(start);
  const base = { startDate };
  const out: { id: RepeatChoice; label: string }[] = [
    { id: 'weekly', label: describeRepeat({ ...base, repeat: 'weekly' }) },
    { id: 'biweekly', label: describeRepeat({ ...base, repeat: 'biweekly' }) },
  ];
  if (weekOfMonth(startDate) <= 4) {
    out.push({
      id: 'monthly',
      label: describeRepeat({ ...base, repeat: 'monthly', monthlyWeek: weekOfMonth(startDate) }),
    });
  }
  if (isLastWeekdayOfMonth(startDate)) {
    out.push({ id: 'monthly-last', label: describeRepeat({ ...base, repeat: 'monthly', monthlyWeek: -1 }) });
  }
  return out;
}

/**
 * The choice to use when the start date changed under it: "last Saturday" on a
 * date that isn't in the last week becomes its week of the month, and a plain
 * monthly on a 5th weekday becomes "last".
 */
export function fitChoice(choice: RepeatChoice, choices: { id: RepeatChoice }[]): RepeatChoice {
  if (choices.some((c) => c.id === choice)) return choice;
  return choice === 'monthly-last' ? 'monthly' : 'monthly-last';
}

export function ruleFromForm(f: {
  start: Date;
  choice: RepeatChoice;
  end: Date | null;
  skipDates?: string[];
}): SeriesRule {
  const startDate = dateKey(f.start);
  const monthly = f.choice === 'monthly' || f.choice === 'monthly-last';
  return {
    repeat: monthly ? 'monthly' : (f.choice as 'weekly' | 'biweekly'),
    startDate,
    timeOfDay: timeKey(f.start),
    monthlyWeek: f.choice === 'monthly-last' ? -1 : monthly ? defaultMonthlyWeek(startDate) : null,
    endDate: f.end ? dateKey(f.end) : null,
    skipDates: f.skipDates ?? [],
  };
}

export function choiceFromSeries(s: Pick<SeriesRule, 'repeat' | 'monthlyWeek'>): RepeatChoice {
  if (s.repeat !== 'monthly') return s.repeat;
  return s.monthlyWeek === -1 ? 'monthly-last' : 'monthly';
}
