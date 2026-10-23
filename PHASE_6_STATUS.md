# Fase 6 — elenco e saúde básica

**Data:** 2026-10-10  
**Estado:** GATES PASS — typecheck, lint, testes (45/45, 10 de saúde) e build passaram no Windows

## Escopo autorizado

Elenco e saúde básica: condição física e lesão simples com recuperação determinística por dias. Sem academia/treino, sem risco de lesão derivado de carga, sem tratamento médico detalhado. O save do FC 27 permanece intocado.

## Implementação

Módulo puro `packages/domain/src/health.ts`, exportado pelo domínio. `PlayerHealth` acompanha condição inteira 0–100, dias restantes de lesão e tipo; as invariantes impedem combinações inválidas. A condição recupera 5 pontos por dia até 100. Lesões contam dias restantes e emitem `INJURY_RECOVERED` ao chegar a zero. `maybeStartInjury` recebe uma rolagem explícita e parâmetros explícitos; não sorteia nem acessa relógio/global. Eventos incluem `HEALTH_RULES_VERSION` para rastreabilidade.

## Gates Windows reportados

`pnpm typecheck`: PASS.  
`pnpm lint`: PASS.  
`pnpm test`: PASS, 45 testes em 8 arquivos; `health.test.ts` contém 10 testes.  
`pnpm build`: PASS em todos os workspaces, incluindo Electron e Prisma.

## Limitações e integração futura

- Saúde ainda não é um campo persistido de `Player` nem tem repositório/migração.
- O motor de calendário (`packages/simulation`) ainda não chama as funções de saúde; o chamador terá de derivar rolagens de lesão de um PRNG com seed e passar o valor para `maybeStartInjury`.
- Os testes demonstram determinismo funcional para entradas idênticas, não repetibilidade de uma temporada integrada.
- Não existe interface ou fluxo de usuário para alterar/consultar estado de saúde.
