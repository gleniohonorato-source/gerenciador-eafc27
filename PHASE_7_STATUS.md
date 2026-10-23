# Fase 7 — capacidade e receita de público

**Data:** 2026-10-10
**Estado:** GATES PASS — typecheck, lint, testes (52/52, 7 deles da Fase 7) e build passaram no Windows

## Escopo autorizado

Capacidade e receita de público, apenas cálculo. Parâmetros fixos e versionados. Sem gramado, manutenção, projetos de capacidade e sem lançamento automático no livro-razão.

## Implementação

Módulo puro `packages/domain/src/stadium.ts`:

- `calculateMatchAttendance` recebe capacidade, demanda em percentual, uma rolagem explícita e a moeda.
- A variação é de até 5 pontos percentuais em torno da demanda, em aritmética inteira.
- A assistência é arredondada para baixo e limitada à capacidade. `atCapacity` indica lotação.
- A receita é exata em unidades menores, multiplicando o preço fixo pela assistência.
- `STADIUM_PARAMETERS_V1` documenta os valores; `STADIUM_RULES_VERSION` vai em cada resultado.

O preço de ingresso de 30,00 na moeda da carreira é um valor de referência escolhido nesta etapa, não derivado do jogo. Deve ser revisado antes de uso real.

## Gates Windows reportados

`pnpm typecheck`, `pnpm lint`, `pnpm test` (52/52 em 9 arquivos, 7 deles de público) e `pnpm build` passaram.

## Limitações

- Nenhum lançamento automático no livro-razão; o chamador é responsável por registrar a receita, evitando duplicidade.
- Sem persistência, repositório ou caso de uso.
- O gerador de rolagens ainda não está ligado ao calendário; quem chama deve fornecer a rolagem a partir da seed.
- Sensibilidade e custos de manutenção ficam para etapas posteriores.
