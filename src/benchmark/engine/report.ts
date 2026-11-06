import { getVersion } from '../registry';
import type { Session } from '../types';
import { LEVEL_SHORT, formatDate, formatFtIn, formatValue } from './format';
import { newestFirst, scoreSession } from './score';

export interface ReportMember {
  name: string;
  heightIn: number | null;
  sessions: Session[];
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const GREEN = '#1F3D2B';
const GOLD = '#C9A961';

const css = `
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 24px; font-size: 11px; }
  h1 { color: ${GREEN}; font-size: 20px; margin: 0 0 4px; }
  h2 { color: ${GREEN}; font-size: 15px; margin: 0 0 8px; }
  .sub { color: #666; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
  th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: ${GREEN}; color: #fff; font-weight: 600; }
  .lvl { display: inline-block; min-width: 18px; padding: 0 4px; border-radius: 3px; background: #E6EEE9; color: ${GREEN}; font-weight: 700; font-size: 10px; text-align: center; }
  .l3 { background: ${GOLD}; color: #fff; }
  .val { color: #555; display: block; font-size: 10px; }
  .page { page-break-before: always; }
  .muted { color: #888; }
`;

function badge(level: number | null): string {
  if (level === null) return '<span class="muted">—</span>';
  return `<span class="lvl${level === 3 ? ' l3' : ''}">${LEVEL_SHORT[level]}</span>`;
}

function sessionCells(s: Session, keys: string[]): string {
  const v = getVersion(s.version);
  return keys
    .map((key) => {
      if (!v || !v.tests[key]) return '<td class="muted">—</td>';
      const level = v.levelFor(key, s);
      let value = '';
      if (key === 'ws') {
        const both = s.results.ws2;
        const one = s.results.ws1;
        value = [both != null ? `2L ${formatValue('time', both)}` : '', one != null ? `1L ${formatValue('time', one)}` : '']
          .filter(Boolean)
          .join(' · ');
      } else {
        const raw = s.results[key];
        value = raw == null ? '' : formatValue(v.tests[key].input, raw);
      }
      return `<td>${badge(level)}${value ? `<span class="val">${esc(value)}</span>` : ''}</td>`;
    })
    .join('');
}

/** Scored keys across every version used by these sessions, in first-seen order. */
function columnKeys(sessions: Session[]): string[] {
  const keys: string[] = [];
  for (const s of sessions) {
    const v = getVersion(s.version);
    v?.scoredKeys.forEach((k) => {
      if (!keys.includes(k)) keys.push(k);
    });
  }
  return keys;
}

function testHeader(keys: string[], sessions: Session[]): string {
  return keys
    .map((k) => {
      const name =
        sessions.map((s) => getVersion(s.version)?.tests[k]?.name).find(Boolean) ?? k;
      return `<th>${esc(name)}</th>`;
    })
    .join('');
}

function scoreText(s: Session): string {
  const sc = scoreSession(s);
  return sc ? `${sc.score}/${sc.maxScore}` : '—';
}

export function buildReportHtml(opts: {
  title: string;
  members: ReportMember[];
  generatedOn: string; // YYYY-MM-DD
  includeGroupTable: boolean;
}): string {
  const all = opts.members.flatMap((m) => m.sessions);
  const keys = columnKeys(all);
  const parts: string[] = [];

  parts.push(`<h1>${esc(opts.title)}</h1><div class="sub">Generated ${esc(formatDate(opts.generatedOn))}</div>`);

  if (opts.includeGroupTable) {
    const rows = opts.members
      .map((m) => {
        const latest = newestFirst(m.sessions)[0];
        if (!latest) return `<tr><td>${esc(m.name)}</td><td colspan="${keys.length + 2}" class="muted">No benchmarks yet</td></tr>`;
        return `<tr><td>${esc(m.name)}</td><td>${esc(latest.date)}</td><td>${scoreText(latest)}</td>${sessionCells(latest, keys)}</tr>`;
      })
      .join('');
    parts.push(
      `<h2>Group (latest benchmark)</h2><table><tr><th>Name</th><th>Date</th><th>Score</th>${testHeader(keys, all)}</tr>${rows}</table>`,
    );
  }

  opts.members.forEach((m, i) => {
    const sessions = newestFirst(m.sessions);
    const pageClass = opts.includeGroupTable || i > 0 ? ' class="page"' : '';
    const height = m.heightIn ? ` · Height ${formatFtIn(m.heightIn)}` : '';
    const rows = sessions
      .map(
        (s) =>
          `<tr><td>${esc(s.date)}<span class="val">v${s.version}</span></td><td>${s.bodyweight} lb</td><td>${scoreText(s)}</td>${sessionCells(s, keys)}</tr>`,
      )
      .join('');
    parts.push(
      `<div${pageClass}><h2>${esc(m.name)}</h2><div class="sub">${sessions.length} benchmark${sessions.length === 1 ? '' : 's'}${height}</div>` +
        (sessions.length
          ? `<table><tr><th>Date</th><th>Weight</th><th>Score</th>${testHeader(keys, all)}</tr>${rows}</table>`
          : '<p class="muted">No benchmarks yet.</p>') +
        `</div>`,
    );
  });

  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${parts.join('')}</body></html>`;
}
