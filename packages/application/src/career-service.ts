import { createCareer, DomainValidationError, type Career, type CareerRepository } from '@gerenciador/domain';

/** Input accepted from the UI boundary. Anything else is rejected before reaching the repository. */
export interface CreateCareerInput {
  readonly name: string;
  readonly currentSeason: string;
}

const MAX_NAME_LENGTH = 80;
const SEASON_PATTERN = /^\d{4}\/\d{2}$/;

export interface CareerService {
  createCareer(input: CreateCareerInput): Promise<Career>;
  listCareers(): Promise<readonly Career[]>;
  openCareer(id: string): Promise<Career>;
}

export interface CareerServiceDependencies {
  readonly repository: CareerRepository;
  readonly listAll: () => Promise<readonly Career[]>;
  readonly newId: () => string;
  readonly newSeed: () => string;
  readonly now: () => Date;
}

/**
 * Application service for the minimal career flow. Ids, seed and timestamps are generated here, never
 * accepted from the caller, so the UI cannot choose them.
 */
export function createCareerService(deps: CareerServiceDependencies): CareerService {
  return {
    async createCareer(input) {
      const name = validateName(input.name);
      const currentSeason = validateSeason(input.currentSeason);
      const career = createCareer({
        id: deps.newId(),
        name,
        currentSeason,
        controlledClubId: null,
        randomSeed: deps.newSeed(),
        createdAt: deps.now().toISOString(),
      });
      await deps.repository.save(career);
      return career;
    },

    async listCareers() {
      return deps.listAll();
    },

    async openCareer(id) {
      if (typeof id !== 'string' || id.trim() === '') {
        throw new DomainValidationError('INVALID_CAREER_ID', 'Career id must be a non-empty string.');
      }
      const career = await deps.repository.findById(id);
      if (!career) {
        throw new DomainValidationError('CAREER_NOT_FOUND', 'Career was not found.');
      }
      return career;
    },
  };
}

function validateName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new DomainValidationError('INVALID_CAREER_NAME', 'Career name must be text.');
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH) {
    throw new DomainValidationError('INVALID_CAREER_NAME', `Career name must have 1 to ${MAX_NAME_LENGTH} characters.`);
  }
  return trimmed;
}

function validateSeason(value: unknown): string {
  if (typeof value !== 'string' || !SEASON_PATTERN.test(value)) {
    throw new DomainValidationError('INVALID_SEASON', 'Season must use the format YYYY/YY.');
  }
  const startYear = Number(value.slice(0, 4));
  const endSuffix = Number(value.slice(5));
  if ((startYear + 1) % 100 !== endSuffix) {
    throw new DomainValidationError('INVALID_SEASON', 'Season end year must follow the start year.');
  }
  return value;
}
