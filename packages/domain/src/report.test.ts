import { describe, expect, it } from 'vitest';
import { buildSeasonReport, REPORT_RULES_VERSION, type HistoryEntry } from './index';

const HEALTH_RULES = 1;

describe('season report', () => {
  it('orders entries by day, then deterministically by kind and identifier', () => {
    const entries: HistoryEntry[] = [
      { kind: 'INJURY_STARTED', day: 5, playerId: 'p-2', causeRuleVersion: HEALTH_RULES },
      { kind: 'FIXTURE_SCHEDULED', day: 5, fixtureId: 'f-1', causeRuleVersion: 1 },
      { kind: 'FIXTURE_SCHEDULED', day: 1, fixtureId: 'f-0', causeRuleVersion: 1 },
    ];
    const report = buildSeasonReport(entries);
    expect(report.lines.map((line) => line.day)).toEqual([1, 5, 5]);
    expect(report.lines[0].text).toBe('Partida f-0 agendada.');
    expect(report.lines[1].text).toBe('Partida f-1 agendada.');
    expect(report.lines[2].text).toBe('Jogador p-2 sofreu lesão.');
  });

  it('is independent of input order', () => {
    const a: HistoryEntry = { kind: 'FIXTURE_SCHEDULED', day: 2, fixtureId: 'x', causeRuleVersion: 1 };
    const b: HistoryEntry = { kind: 'INJURY_RECOVERED', day: 2, playerId: 'y', causeRuleVersion: HEALTH_RULES };
    expect(buildSeasonReport([a, b])).toEqual(buildSeasonReport([b, a]));
  });

  it('describes only the facts supplied, using fixed templates', () => {
    const report = buildSeasonReport([
      { kind: 'INJURY_RECOVERED', day: 9, playerId: 'p-7', causeRuleVersion: HEALTH_RULES },
    ]);
    expect(report.lines).toEqual([{ day: 9, text: 'Jogador p-7 recuperou-se da lesão.' }]);
  });

  it('returns an empty report for no history and records the rules version', () => {
    const report = buildSeasonReport([]);
    expect(report.lines).toHaveLength(0);
    expect(report.rulesVersion).toBe(REPORT_RULES_VERSION);
  });

  it('fails closed on an unsupported entry kind instead of inventing text', () => {
    const unknownEntry = { kind: 'MATCH_RESULT_GUESSED', day: 1 } as unknown as HistoryEntry;
    expect(() => buildSeasonReport([unknownEntry])).toThrow(RangeError);
  });

  it('does not mutate the input array', () => {
    const entries: HistoryEntry[] = [
      { kind: 'FIXTURE_SCHEDULED', day: 3, fixtureId: 'b', causeRuleVersion: 1 },
      { kind: 'FIXTURE_SCHEDULED', day: 1, fixtureId: 'a', causeRuleVersion: 1 },
    ];
    const snapshot = [...entries];
    buildSeasonReport(entries);
    expect(entries).toEqual(snapshot);
  });
});
