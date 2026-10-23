# Fase 9 — sincronização local de resultados

**Data:** 2026-10-10
**Estado:** GATES PASS — typecheck, lint, testes (72/72, 14 deles da Fase 9) e build passaram no Windows

## Escopo autorizado

Sincronização apenas por arquivo local fornecido pelo usuário. Sem fornecedor externo, rede, API ou termos de licença. A escolha foi registrada pelo usuário antes da implementação.

## Implementação

Módulo `packages/application/src/result-sync.ts`, sem alterar a entidade `Fixture`:

- `planResultSync` compara resultados recebidos com as partidas e com os registros já aplicados, e devolve uma decisão por linha, sem gravar nada.
- Decisões: `APPLY`, `UNCHANGED` (reimportação idempotente) e `CONFLITO`, com motivo.
- Motivos de conflito: `DIFFERENT_RESULT_SAME_VERSION`, `OLDER_VERSION`, `FIXTURE_MISSING`, `SCHEDULE_CHANGED`.
- Uma fonte que tenta substituir o resultado de outra fonte gera conflito; nunca há sobrescrita silenciosa.
- Mudança de horário gera conflito em vez de aplicar o resultado a uma partida movida. Comparação em UTC.
- `revertSyncBatch` restaura o registro anterior de cada partida alterada pelo lote.
- Linha malformada rejeita o arquivo inteiro, por segurança.

`RESULT_SYNC_RULES_VERSION` vai em cada plano.

## Gates Windows reportados

`pnpm typecheck`, `pnpm lint`, `pnpm test` (72/72 em 11 arquivos, 14 deles de sincronização) e `pnpm build` passaram.

## Limitações

- Não há persistência dos registros aplicados, nem caso de uso que grave o plano, nem reversão persistida.
- Não há tela de revisão de conflitos; o plano é devolvido como dados.
- O formato do arquivo de resultados ainda não foi ligado ao leitor da Fase 3; o plano recebe valores já lidos.
- Postergações não são aplicadas automaticamente: viram conflito para revisão.
