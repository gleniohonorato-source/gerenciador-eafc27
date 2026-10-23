import type { HealthEvent } from './health';

/** Version of the report rules. Stored with every generated report to explain it later. */
export const REPORT_RULES_VERSION = 1;

/**
 * A confirmed history entry supplied by the caller. The report only reads these; it never invents
 * facts, and it never reads from storage or the game directly.
 */
export type HistoryEntry =
  | { readonly kind: 'FIXTURE_SCHEDULED'; readonly day: number; readonly fixtureId: string; readonly causeRuleVersion: number }
  | (HealthEvent & { readonly kind: 'INJURY_STARTED' | 'INJURY_RECOVERED' });

export interface ReportLine {
  readonly day: number;
  readonly text: string;
}

export interface SeasonReport {
  readonly rulesVersion: number;
  readonly lines: readonly ReportLine[];
}

/**
 * Fixed text templates, one per supported entry kind. Placeholders are filled only from the entry's
 * own fields. Unknown entry kinds fail closed instead of being described loosely.
 */
const TEMPLATES = Object.freeze({
  FIXTURE_SCHEDULED: (entry: { fixtureId: string }) => `Partida ${entry.fixtureId} agendada.`,
  INJURY_STARTED: (entry: { playerId: string }) => `Jogador ${entry.playerId} sofreu lesão.`,
  INJURY_RECOVERED: (entry: { playerId: string }) => `Jogador ${entry.playerId} recuperou-se da lesão.`,
});

export function buildSeasonReport(entries: readonly HistoryEntry[]): SeasonReport {
  const sorted = [...entries].sort((left, right) => {
    if (left.day !== right.day) return left.day - right.day;
    const leftKey = `${left.kind}|${idOf(left)}`;
    const rightKey = `${right.kind}|${idOf(right)}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
  const lines = sorted.map((entry): ReportLine => {
    if (entry.kind === 'FIXTURE_SCHEDULED') {
      return Object.freeze({ day: entry.day, text: TEMPLATES.FIXTURE_SCHEDULED(entry) });
    }
    if (entry.kind === 'INJURY_STARTED') {
      return Object.freeze({ day: entry.day, text: TEMPLATES.INJURY_STARTED(entry) });
    }
    if (entry.kind === 'INJURY_RECOVERED') {
      return Object.freeze({ day: entry.day, text: TEMPLATES.INJURY_RECOVERED(entry) });
    }
    throw new RangeError(`Unsupported history entry kind: ${(entry as { kind: string }).kind}`);
  });
  return Object.freeze({ rulesVersion: REPORT_RULES_VERSION, lines: Object.freeze(lines) });
}

function idOf(entry: HistoryEntry): string {
  return entry.kind === 'FIXTURE_SCHEDULED' ? entry.fixtureId : entry.playerId;
}
