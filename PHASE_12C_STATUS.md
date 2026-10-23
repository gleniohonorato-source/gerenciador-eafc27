# Fase 12C — pacote de teste local Windows x64

**Alvo autorizado:** instalador NSIS x64 para validação local, não publicação. Sem assinatura de código nesta fase.

**Estado consolidado:** instalador NSIS x64 de validação local foi reportado como executável (janela exibida, Prisma abre e carreira “Duisburg · 2026/27” listada). Gates automatizados de build correspondentes foram reportados PASS em registros anteriores. Backup/restauração no instalado e desinstalação/reinstalação com “Duisburg” preservado foram reportados PASS historicamente. Upgrade in-place 0.1.0 → 0.1.1 foi confirmado pelo usuário, sem desinstalar, com a carreira preservada. Em 2026-10-16, o usuário confirmou ainda que o pacote foi gerado/instalado e testou a edição de jogador com persistência após reabrir; `typecheck`, `lint`, `test` (103) e `build` foram reportados PASS. Nenhum desses gates/fluxos históricos foi reexecutado nesta reconciliação documental. A arquitetura alvo segue x64. Sem assinatura; somente validação local, não distribuição pública. A versão/hash exatos do pacote instalado com 12H não foram fornecidos aqui.

## Configuração atual

- `apps/desktop/package.json`: alvo electron-builder NSIS x64, diretório de saída `release`, ASAR habilitado, módulos `.node` fora do ASAR, atalhos Start/Desktop e desinstalação preservando appData.
- `scripts/copy-prisma-runtime.mjs`: copia cliente gerado e engine nativa Prisma para `apps/desktop/.package-resources/prisma-client` antes do empacotamento.
- `main.ts`: migração inicial embutida como recurso bruto no bundle; no app empacotado verifica presença do engine Prisma em `process.resourcesPath` e define `PRISMA_QUERY_ENGINE_LIBRARY`.
- Prisma Client v6.19.3 foi configurado com engine nativa Windows, verificado no arquivo gerado `query_engine-windows.dll.node`.

## Procedimento histórico para upgrade 0.1.0 → 0.1.1 (executado conforme registro abaixo)

O workspace agora está marcado como 0.1.1. Na raiz, rode `pnpm install`, depois `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm package:win`. Antes de testar, mantenha salvo o backup `.db` e seu `.manifest.json` em local externo. Instale o Setup 0.1.1 sobre o 0.1.0 sem desinstalar primeiro; abra e confirme “Duisburg”. Se falhar, pare, não apague `%APPDATA%\@gerenciador\desktop`, e envie a mensagem/log. Esse teste é local e não autoriza publicação.

## Histórico de empacotamento e correção de falhas — outubro de 2026

As subseções seguintes registram tentativas antigas e falhas já diagnosticadas/corrigidas. Não descrevem o estado final validado na primeira seção; não repetir como pendências atuais sem evidência nova.

### Artefato inicial e falha de runtime

`apps/desktop/release/Gerenciador EA FC 27 Setup 0.1.0.exe` (NSIS x64, aproximadamente 104 MB) foi gerado em 2026-10-12. O usuário instalou e reportou erro no processo principal: `SyntaxError: Named export 'PrismaClient' not found`; Prisma v6 é CommonJS, mas o bundle ESM fez named import. O instalador atual não é utilizável. A factory do cliente agora carrega Prisma via `createRequire` (Prisma v6 CommonJS), com caminho configurável em `GERENCIADOR_PRISMA_CLIENT_PATH`; `main.ts` define cliente e engine empacotados antes de abrir o banco. O client gerado copiado para `.package-resources` e `release` fez o lint examinar milhares de linhas de código de terceiros; ambos os diretórios foram adicionados aos ignores. Lint reaplicado pelo usuário em 2026-10-12: PASS sem erros. Na segunda rodada, o usuário reportou typecheck PASS, 87 testes PASS, build PASS e `pnpm package:win` PASS, gerando novamente `Gerenciador EA FC 27 Setup 0.1.0.exe` sem assinatura. Próximo gate: instalar e confirmar que a aplicação abre e que Prisma consegue operar a base.

### Diagnóstico da segunda instalação

O usuário informou que instalou a segunda versão, mas ao iniciar não apareceu janela nem mensagem. A instrumentação grava `userData/startup.log`, registra exceções/rejeições, falha/encerramento do renderer e mostra diálogo nativo em falha fatal. Gates do código de instrumentação reportados PASS pelo usuário em 2026-10-12 (lint, typecheck, 14 arquivos/87 testes, build). O diálogo do instalador instrumentado identificou `Cannot find module '@prisma/client/runtime/library.js'` requerido pelo client gerado. A cópia inicial do diretório runtime não preservava a topologia que o resolvedor CommonJS usa. Corrigido o script para copiar o runtime em `resources/prisma-client/node_modules/@prisma/client/runtime`, ao lado do client relocated, e a inicialização verifica esse caminho. A cópia foi verificada no ambiente local. Precisa passar gates e gerar nova versão para testar.

## Pendências atuais para release público

- O instalador permanece sem assinatura de código; não é release público.
- A instalação limpa em ambiente Windows descartável não foi confirmada nesta atualização documental.
- O upgrade 0.1.0→0.1.1 e a preservação de `userData` foram validados historicamente; não há hash/versionamento do artefato 12H reportado nesta revisão. Identificar o artefato exato antes de associar a validação a um release candidate.
- Reconfirmar no artefato candidato final backup/restauração após uma edição de jogador, sem usar como cobaia a única cópia dos dados.
- Concluir revisão independente de segurança/dependências e os itens de avisos, privacidade, suporte, atualização e rollback descritos em `DISTRIBUTION_READINESS.md`.

As falhas de empacotamento descritas nas subseções históricas acima foram seguidas por correções e validações reportadas como PASS; não são consideradas bloqueadores atuais por si só. Reabrir somente se nova evidência indicar regressão.
