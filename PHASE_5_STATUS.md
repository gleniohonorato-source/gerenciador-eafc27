# Fase 5 — livro-razão e orçamento

**Data:** 2026-10-10
**Estado:** GATES PASS — typecheck, lint, testes (35/35, 10 deles da Fase 5) e build passaram no Windows

## Escopo autorizado

Livro-razão e orçamento, com uma moeda por carreira. Fora do escopo: custos recorrentes, contratos comerciais e projeções. Nenhuma conversão de câmbio.

## Implementação

Módulo `packages/domain/src/budget.ts`, sem dependências de plataforma:

- `createBudgetLimit` valida mês (YYYY-MM), limite não negativo e moeda de 3 letras.
- `evaluateBudget` soma apenas despesas (`EXPENSE`) do clube, categoria e mês do orçamento. Receitas são ignoradas.
- Estados: `WITHIN_LIMIT`, `WARNING` (a partir de 80%, aritmética inteira em basis points) e `OVER_LIMIT` (gasto estritamente acima do limite). Limite zero com qualquer gasto é `OVER_LIMIT`.
- Lançamento da mesma categoria/clube/mês em outra moeda é rejeitado, nunca convertido.
- `BUDGET_RULES_VERSION` é retornado em cada avaliação para explicar resultados depois.

O saldo do livro-razão já existia (`calculateBalance`, em `entities.ts`) e não foi alterado.

## Testes

`budget.test.ts` (10 testes): validação de mês, limite e moeda; soma apenas de correspondências; limiar de 80%; estouro estrito; limite zero; rejeição de moeda diferente; ignorar moeda diferente fora do escopo; independência da ordem.

## Limitações

- Não há persistência de orçamentos no banco nem caso de uso/IPC; a avaliação é puramente de domínio.
- Não há trilha de auditoria gravada: a avaliação devolve a versão de regras e os totais, mas nenhum registro de quem alterou um limite. Isso fica para uma etapa posterior.
- Nenhuma ligação com calendário, custos recorrentes ou contratos.
