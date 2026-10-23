# Fase 8 — histórico e relatório textual

**Data:** 2026-10-10
**Estado:** GATES PASS — typecheck, lint, testes (58/58, 6 deles da Fase 8) e build passaram no Windows

## Escopo autorizado

Histórico e relatório textual, com modelos de texto fixos para a narrativa. Sem painéis gráficos, propostas de mudança ou modelo de linguagem.

## Implementação

Módulo puro `packages/domain/src/report.ts`:

- `buildSeasonReport` recebe eventos já confirmados fornecidos pelo chamador e devolve linhas ordenadas por dia e, em caso de empate, por tipo e identificador.
- Três tipos são suportados: `FIXTURE_SCHEDULED`, `INJURY_STARTED` e `INJURY_RECOVERED`. Cada um tem um modelo de texto fixo, preenchido apenas com campos do próprio evento.
- Tipos desconhecidos geram erro, em vez de texto inventado.
- A entrada não é alterada, e `REPORT_RULES_VERSION` vai em cada relatório.

## Gates Windows reportados

`pnpm typecheck`, `pnpm lint`, `pnpm test` (58/58 em 10 arquivos, 6 deles de relatório) e `pnpm build` passaram.

## Limitações

- O relatório não lê armazenamento nem o calendário diretamente; quem chama deve fornecer os eventos.
- Orçamento e público calculam resultados, mas não geram eventos, então não entram no histórico ainda.
- Os textos são mensagens em português com identificadores técnicos (`f-0`, `p-7`), sem nomes reais de jogadores ou clubes. Uma etapa futura deve trocar os identificadores por nomes de exibição.
- Sem painéis, propostas de mudança nem narrativa além dos modelos fixos.
