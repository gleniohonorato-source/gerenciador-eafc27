import { describe, expect, it } from 'vitest';
import { DomainValidationError, type Career, type CareerRepository } from '@gerenciador/domain';
import { createCareerService } from './career-service';

class MemoryCareerRepository implements CareerRepository {
  readonly rows = new Map<string, Career>();
  async findById(id: string) { return this.rows.get(id) ?? null; }
  async findByName(name: string) { return [...this.rows.values()].find((career) => career.name === name) ?? null; }
  async save(entity: Career) { this.rows.set(entity.id, entity); }
}

function build(repository = new MemoryCareerRepository()) {
  let counter = 0;
  const service = createCareerService({
    repository,
    listAll: async () => [...repository.rows.values()],
    newId: () => `career-${++counter}`,
    newSeed: () => `seed-${counter}`,
    now: () => new Date('2026-10-10T12:00:00.000Z'),
  });
  return { service, repository };
}

describe('career service', () => {
  it('creates a career with service-generated id, seed and timestamp', async () => {
    const { service, repository } = build();
    const career = await service.createCareer({ name: '  Minha carreira  ', currentSeason: '2026/27' });
    expect(career).toEqual({
      id: 'career-1',
      name: 'Minha carreira',
      currentSeason: '2026/27',
      controlledClubId: null,
      randomSeed: 'seed-1',
      createdAt: '2026-10-10T12:00:00.000Z',
    });
    expect(repository.rows.get('career-1')).toEqual(career);
  });

  it('lists the careers that were saved', async () => {
    const { service } = build();
    await service.createCareer({ name: 'Primeira', currentSeason: '2026/27' });
    await service.createCareer({ name: 'Segunda', currentSeason: '2027/28' });
    const names = (await service.listCareers()).map((career) => career.name);
    expect(names).toEqual(['Primeira', 'Segunda']);
  });

  it('reopens a career by id and fails for an unknown id', async () => {
    const { service } = build();
    const created = await service.createCareer({ name: 'Reabrir', currentSeason: '2026/27' });
    expect(await service.openCareer(created.id)).toEqual(created);
    await expect(service.openCareer('missing')).rejects.toThrow(DomainValidationError);
    await expect(service.openCareer('   ')).rejects.toThrow(/non-empty/);
  });

  it('rejects an empty, too long or non-text name', async () => {
    const { service } = build();
    await expect(service.createCareer({ name: '   ', currentSeason: '2026/27' })).rejects.toThrow(/1 to 80/);
    await expect(service.createCareer({ name: 'x'.repeat(81), currentSeason: '2026/27' })).rejects.toThrow(/1 to 80/);
    await expect(service.createCareer({ name: 42 as unknown as string, currentSeason: '2026/27' })).rejects.toThrow(/must be text/);
  });

  it('rejects a malformed season and one whose end year does not follow the start', async () => {
    const { service } = build();
    await expect(service.createCareer({ name: 'A', currentSeason: '2026-27' })).rejects.toThrow(/YYYY\/YY/);
    await expect(service.createCareer({ name: 'A', currentSeason: '2026/28' })).rejects.toThrow(/follow the start/);
  });

  it('does not accept caller-supplied id, seed or timestamp', async () => {
    const { service } = build();
    const career = await service.createCareer({
      name: 'Seguro',
      currentSeason: '2026/27',
      id: 'attacker-id',
      randomSeed: 'chosen',
      createdAt: '1999-01-01T00:00:00.000Z',
    } as unknown as { name: string; currentSeason: string });
    expect(career.id).toBe('career-1');
    expect(career.randomSeed).toBe('seed-1');
    expect(career.createdAt).toBe('2026-10-10T12:00:00.000Z');
  });
});
