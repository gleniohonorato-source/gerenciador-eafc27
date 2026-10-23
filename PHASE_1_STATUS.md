# Fase 1 — status da fundação

**Data:** 2026-10-09  
**Estado:** PASS — gates informados pelo usuário passaram após correções; janela de desenvolvimento abriu

## Escopo executado nesta pasta

Criada a estrutura pnpm workspace para app desktop e pacotes `domain`, `simulation`, `shared` e `database`; configurações TypeScript, ESLint, Prettier e Vitest; shell Electron com context isolation, sandbox, Node integration desativada, CSP e preload mínimo; renderer React placeholder. Nenhuma regra de domínio, simulação, schema Prisma, integração com FC 27/Live Editor ou código de leitura/escrita de save foi implementado.

O usuário instalou as dependências no Windows; `pnpm install` terminou com avisos deprecados, mas sem erro. Na repetição após as correções, o usuário informou `pnpm typecheck`, `pnpm lint`, `pnpm test` (3 testes) e `pnpm build` PASS. O `pnpm dev` passou a iniciar o renderer, mas revelou falta de `main` no `apps/desktop/package.json`; foi adicionado `"main": "out/main/main.js"`. Depois disso, o usuário confirmou que a aplicação abriu. Resultado: Fase 1 marcada PASS com base nos logs e na confirmação do usuário. A revisão de segurança está limitada a inspeção estática dos arquivos e testes baseline; ainda não é certificação de segurança para distribuição.

## Gates reportados pelo usuário

`pnpm install`: PASS, instalou pnpm 9.15.5 e 271 pacotes. Houve avisos de `eslint@9.39.5` depreciado, subdependência deprecated, aviso Node `DEP0169` e aviso CJS de Vite; devem ser revistos antes de distribuição.

Primeira rodada: `pnpm typecheck` PASS em todos os 5 workspaces; `pnpm test` PASS (3 testes); lint/build/dev falharam. Corrigidos namespace React e caminhos/entrada do renderer.

Segunda rodada: `pnpm typecheck` PASS; `pnpm lint` PASS; `pnpm test` PASS (3 testes); `pnpm build` PASS. `pnpm dev` serviu o renderer, mas falhou por falta de campo `main` no manifesto do app Electron. Campo `"main": "out/main/main.js"` adicionado depois do log.

Após adicionar o campo `main`, o usuário confirmou que a janela abriu com `pnpm dev`. As verificações reportadas da Fase 1 estão concluídas. A inspeção registrada é estática e baseline, não uma certificação de segurança de produção.

## Cautelas de validação

- Não executar nenhum comando na pasta irmã `GERENCIADOR_EA_FC_27`.
- `pnpm install` fará download de dependências do registry configurado. O usuário pode revisar `package.json` antes de executar.
- As versões do Electron/Vite/React/TypeScript declaradas são intervalos sem lockfile até a primeira instalação; o lockfile deve ser guardado e revisado depois.
- CSP de desenvolvimento é mais permissiva para localhost; build de produção usa política restritiva. Validar ambos antes de release.
- O bridge do preload expõe somente identificador de runtime/versão, sem APIs privilegiadas ou canais IPC.
- Os gates ainda não foram executados e não há evidência de PASS nesta data.