# Fase 2 — domínio e persistência

**Data:** 2026-10-10  
**Estado:** GATES PASS — typecheck, lint, 9 testes, build e migração Prisma passaram; limitação documentada em backup/restore

## Escopo da etapa

Implementados value objects e fábricas puras para Career, Club, Player, Fixture e FinanceEntry, validação/proveniência e cálculo do saldo a partir do livro-razão. Adicionados contratos de repositório ao pacote de domínio. Criados schema Prisma SQLite e migração inicial para banco próprio do aplicativo, client factory e repositórios Prisma com validação na leitura/escrita. Nenhum save do FC 27 é lido ou alterado; não há Live Editor, importação ou sincronização nesta fase.

## Dependências

Foi aprovada a adição do Prisma 6.19.3. O usuário reportou que `pnpm install` passou, atualizando dependências e lockfile, e `pnpm db:generate` passou, gerando o Prisma Client v6.19.3. Houve avisos Node DEP0169, ESLint depreciado e subdependência antiga; não impediram instalação, mas precisam de revisão antes de distribuição. A primeira tentativa de `prisma validate` falhou porque `DATABASE_URL` não estava definida; também não resolveu `prisma` via `pnpm exec` no filtro selecionado. Adicionei scripts `db:validate` no pacote e na raiz. O usuário executou `pnpm db:validate`: PASS, Prisma 6.19.3 confirmou schema válido e carregou `.env`. O usuário executou `pnpm db:migrate`: PASS; Prisma aplicou `20261009000000_initial`, criou `packages/database/prisma/dev.db` e informou banco sincronizado com schema. Prisma Client 6.19.3 foi gerado novamente. O arquivo `dev.db` é banco do aplicativo e deve permanecer ignorado pelo Git.

## Próximo passo no Windows

Na raiz desta pasta, rode:

```powershell
pnpm install
Copy-Item "packages/database/.env.example" "packages/database/.env"
pnpm db:generate
pnpm db:validate
pnpm db:migrate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

`db:migrate` cria/aplica a migração local. Execute os comandos da raiz como mostrados; scripts do pacote apontam ao schema correto. O teste de repositório cria banco temporário em `%TEMP%` e remove ao final. Não apontar `DATABASE_URL` para pasta/arquivo de save do jogo. Confira sempre que `packages/database/.env` use `file:./dev.db` (banco SQLite do aplicativo).

## Gates

Reportados como concluídos: `pnpm install`, `pnpm db:generate`, `pnpm db:validate`, `pnpm db:migrate`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (9/9) e `pnpm build`. As primeiras rodadas de typecheck e testes encontraram defeitos, corrigidos antes de aprovação. Os testes incluem persistência/releitura dos agregados iniciais em SQLite temporário. Limitação: export/backup/restore e recuperação/migração reversível ainda não têm teste dedicado; registrar como dívida para fase posterior antes de distribuição. Fase 3 não está autorizada por esta implementação.
