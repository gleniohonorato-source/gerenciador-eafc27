export class DomainValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'DomainValidationError';
    this.code = code;
  }
}

export function assertNonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new DomainValidationError('EMPTY_VALUE', `${field} must not be empty.`);
  }
  return normalized;
}
