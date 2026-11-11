import { currentPick, filterPickItems, finishPick, startPick, subscribePick, toPickItem } from '../picker';
import { matchesWords } from '../search';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

describe('matchesWords', () => {
  it('needs every word, in any order, ignoring case and accents', () => {
    expect(matchesWords('Goblet squat 3×8', 'SQUAT gob')).toBe(true);
    expect(matchesWords('Goblet squat 3×8', 'squat lunge')).toBe(false);
    expect(matchesWords('Crème brûlée', 'creme brulee')).toBe(true);
    expect(matchesWords('anything', '  ')).toBe(true);
  });
});

describe('filterPickItems', () => {
  const items = ['Goblet squat 3×8', 'Romanian deadlift 3×8', 'Plank 3×30s'].map(toPickItem);

  it('keeps matching items in their original order', () => {
    expect(filterPickItems(items, '3×8').items.map((i) => i.id)).toEqual([
      'Goblet squat 3×8',
      'Romanian deadlift 3×8',
    ]);
  });

  it('searches subtitle and hidden keywords too', () => {
    const people = [{ id: 'u1', title: 'Amy', subtitle: 'Coach', keywords: 'amy@x.com' }];
    expect(filterPickItems(people, 'coach').items).toHaveLength(1);
    expect(filterPickItems(people, 'x.com').items).toHaveLength(1);
  });

  it('offers what was typed as a custom row only when allowed and not an exact item', () => {
    expect(filterPickItems(items, 'Wall sit 3×45s', true).custom).toBe('Wall sit 3×45s');
    expect(filterPickItems(items, 'Wall sit 3×45s', false).custom).toBeNull();
    expect(filterPickItems(items, 'plank 3×30s', true).custom).toBeNull();
    expect(filterPickItems(items, '   ', true).custom).toBeNull();
  });
});

describe('pick requests', () => {
  const opts = { title: 'Choose', items: [toPickItem('A'), toPickItem('B')] };

  it('resolves with the ids chosen and then closes', async () => {
    const done = startPick(opts, true);
    const req = currentPick()!;
    expect(req.multiple).toBe(true);
    finishPick(req.key, ['A', 'B']);
    await expect(done).resolves.toEqual(['A', 'B']);
    expect(currentPick()).toBeNull();
  });

  it('resolves null on cancel, and a late cancel after choosing is ignored', async () => {
    const done = startPick(opts, false);
    const { key } = currentPick()!;
    finishPick(key, ['B']);
    finishPick(key, null); // e.g. the screen's Back listener firing after the choice
    await expect(done).resolves.toEqual(['B']);
  });

  it('opening a second pick cancels the first', async () => {
    const first = startPick(opts, false);
    const second = startPick(opts, false);
    await expect(first).resolves.toBeNull();
    finishPick(currentPick()!.key, ['A']);
    await expect(second).resolves.toEqual(['A']);
  });

  it('tells the open pick screen when a newer request replaces it (double tap)', async () => {
    const seen: (number | undefined)[] = [];
    const unsubscribe = subscribePick(() => seen.push(currentPick()?.key));
    const first = startPick(opts, false);
    const firstKey = currentPick()!.key;
    const second = startPick(opts, false);
    const secondKey = currentPick()!.key;
    finishPick(secondKey, ['B']);
    unsubscribe();
    startPick(opts, false); // not seen after unsubscribe
    finishPick(currentPick()!.key, null);
    expect(seen).toEqual([firstKey, undefined, secondKey, undefined]);
    await expect(first).resolves.toBeNull();
    await expect(second).resolves.toEqual(['B']);
  });
});
