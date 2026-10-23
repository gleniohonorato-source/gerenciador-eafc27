import { createPlayer, type Player, type ProvenanceKind } from '@gerenciador/domain';
import type { Prisma, PrismaClient } from '@prisma/client';

export interface PlayerProfileInput {
  readonly name: string;
  readonly birthDate: string | null;
  readonly overall: number | null;
  readonly potential: number | null;
  readonly heightCm: number | null;
  readonly weightKg: number | null;
}

export async function updatePlayerProfile(
  prisma: PrismaClient | Prisma.TransactionClient,
  careerId: string,
  playerId: string,
  input: PlayerProfileInput,
  now: Date = new Date(),
): Promise<Player> {
  const performUpdate = async (transaction: Prisma.TransactionClient): Promise<Player> => {
    const existing = await transaction.player.findFirst({ where: { id: playerId, careerId } });
    if (!existing) throw new Error('Jogador não encontrado nesta carreira.');

    const originalProvenanceKind = (existing.originalProvenanceKind ?? existing.provenanceKind) as ProvenanceKind;
    const originalProvenanceSource = existing.originalProvenanceSource ?? existing.provenanceSource;
    const originalProvenanceRecordedAt = existing.originalProvenanceRecordedAt ?? existing.provenanceRecordedAt;
    const validated = createPlayer({
      id: existing.id,
      careerId: existing.careerId,
      currentClubId: existing.currentClubId,
      name: input.name,
      birthDate: input.birthDate,
      overall: input.overall,
      potential: input.potential,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      provenanceKind: 'USER_ENTERED',
      provenanceSource: 'edited-in-local-manager',
      provenanceRecordedAt: now.toISOString(),
      originalProvenanceKind,
      originalProvenanceSource,
      originalProvenanceRecordedAt: originalProvenanceRecordedAt.toISOString(),
    });

    const result = await transaction.player.updateMany({
      where: { id: playerId, careerId },
      data: {
        name: validated.name,
        birthDate: validated.birthDate === null ? null : new Date(`${validated.birthDate}T00:00:00.000Z`),
        overall: validated.overall,
        potential: validated.potential,
        heightCm: validated.heightCm,
        weightKg: validated.weightKg,
        provenanceKind: validated.provenanceKind,
        provenanceSource: validated.provenanceSource,
        provenanceRecordedAt: now,
        originalProvenanceKind: validated.originalProvenanceKind,
        originalProvenanceSource: validated.originalProvenanceSource,
        originalProvenanceRecordedAt: new Date(validated.originalProvenanceRecordedAt!),
      },
    });
    if (result.count !== 1) throw new Error('O jogador mudou de carreira ou não está mais disponível.');

    return validated;
  };

  const client = prisma as PrismaClient;
  if (typeof client.$transaction === 'function') {
    return client.$transaction(performUpdate);
  }
  return performUpdate(prisma as Prisma.TransactionClient);
}
