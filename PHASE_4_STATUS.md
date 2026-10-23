# Fase 4 — calendário e avanço determinístico

**Data:** 2026-10-10  
**Estado:** GATES PASS — typecheck, lint, testes (25/25, 10 deles da Fase 4) e build passaram no Windows

## Autorização e escopo

Fase 4 autorizada com escopo: calendário e avanço diário com seed, horizonte de uma temporada. Não inclui forma, fadiga, nem simulação de resultados de partidas. Save do FC 27 permanece intocado.

## Implementação

Pacote `@gerenciador/simulation`, sem dependência de plataforma (`node:*`, `Math.random`, relógio), conforme ARCHITECTURE.md.

- `prng.ts`: gerador pseudoaleatório determinístico a partir de seed textual (FNV-1a + mulberry32). Sem `Math.random`.
- `calendar.ts`: gera temporada de liga em turno único (método do círculo), com ordem de clubes embaralhada pela seed. Cada clube joga uma vez contra cada outro, em uma rodada por semana (7 dias). `CALENDAR_RULES_VERSION` é guardado em cada calendário para explicar históricos. `advanceSeason` percorre os dias e emite um evento causal `FIXTURE_SCHEDULED` por partida, com a versão de regras.
- `calendar.test.ts`: testes de repetibilidade, dependência da seed, pares únicos, máximo de um jogo por clube por rodada, horizonte de uma temporada, validação de entrada e log causal.

## Limitações

Liga em turno único apenas; não há copa, mando de campo alternado por temporada, nem calendário real do FC 27. Os eventos registram apenas agendamento, não resultados. Testes de propriedade mais amplos e medição de performance em Windows ainda não foram executados.

## Resultado no Windows

`pnpm typecheck`, `pnpm lint`, `pnpm test` (25/25 em 6 arquivos, incluindo 10 testes da Fase 4) e `pnpm build` passaram. Repetibilidade entre execuções de processo ainda não foi verificada além dos testes de mesma seed na mesma execução. Performance não foi medida: o horizonte de uma temporada é pequeno e não há benchmark dedicado.
