# Fase 12A — interface de carreira, abertura, calendário, importação e elenco

**Data:** 2026-10-16
**Estado:** Fases 12A/12D/12E/12F/12G validadas localmente anteriormente. Subfase 12H de edição controlada concluída em escopo local. O usuário reportou no Windows `pnpm typecheck`, `pnpm lint`, `pnpm test` (16 arquivos/103 testes) e `pnpm build` PASS; confirmou também que `pnpm package:win` foi instalado, que a edição persistiu após reabertura, e enviou captura da versão instalada mostrando o perfil rolável com o botão “Editar jogador” acessível. Isso não equivale a validação em máquina limpa, assinatura ou autorização para release público. Sem leitura/escrita de save, acesso a processo de jogo ou rede.

## Fase 12D/12E — importação de calendário e elenco pela interface (concluída em escopo local)

- O usuário autorizou a importação pela interface em 2026-10-14, limitada a JSON do formato próprio `gerenciador-eafc-career` v1 e à carreira aberta no app.
- Fluxo em código: diálogo nativo de seleção no processo principal; leitura limitada a 5 MiB com UTF-8 estrito; token opaco em memória para o renderer não escolher caminho nem enviar conteúdo; preview do caso de uso, resumo de contagens/avisos/conflitos e confirmação explícita; confirmação revalida digest dentro da transação e salva apenas fixtures agendados para a temporada atual, referenciando clubes já cadastrados; lista recarrega após commit.
- Importa partidas e jogadores (12E). A carreira nunca é gravada por este fluxo. Clubes referenciados são criados antes das partidas, dentro da mesma transação; clubes existentes nunca são modificados. Jogadores são gravados após os clubes (FK em currentClubId) e rejeitados se referenciarem clube fora do pacote; falha em qualquer gravação reverte tudo.
- Tokens expiram em cinco minutos; seleções e previews limitados a oito entradas; cancelamento não grava. Conflitos bloqueiam confirmação.
- Testes de aplicação adicionados para sucesso, cancelamento, stale digest, conflito, referência inválida e rollback.
- Gates Windows após 12E: `pnpm lint`, `pnpm typecheck`, `pnpm test` (15 arquivos/95 testes, 7 de importação de calendário+elenco) e `pnpm build` PASS. Teste manual do elenco validado pelo usuário (captura, 2026-10-14): importação do `exemplo-elenco-teste.json` confirmou "3 partidas e 3 jogadores importados para Duisburg". `pnpm package:win` regenerou o instalador 0.1.1 e a instalação in-place foi validada por captura: janela "Gerenciador EA FC 27" exibe Duisburg aberta, as 3 partidas com data/hora de Berlim e status Agendado, mensagem de elenco importado e entrada "Aberta" na lista. Fluxo 12D/12E concluído em escopo local; sem assinatura, não é release público.

## Fase 12F — visualização de elenco (concluída)

- Autorizada pelo usuário (2026-10-14): somente leitura, sem edição/exclusão/treinamento e sem integração com saves.
- Canal IPC allowlisted `squad:list` consulta jogadores da carreira com nome do clube; interface carrega elenco junto com calendário ao abrir a carreira e exibe seção com nome, clube, overall/potencial e idade; estado vazio orienta importar.
- Jogadores também são recarregados após confirmação de importação e limpos ao restaurar backup.
- Gates Windows reportados pelo usuário em 2026-10-15: `pnpm typecheck` PASS, `pnpm test` PASS (15 arquivos/95 testes), `pnpm build` PASS, `pnpm package:win` PASS (NSIS x64 0.1.1 gerado; main inclui IPC de elenco e renderer inclui a seção) e `pnpm lint` PASS. Validação visual por captura: app instalado v0.1.1 exibe Calendário e Elenco · 3 jogadores, com clube, overall/potencial e idade; Duisburg segue aberta. Atualização instalada in-place. Todos os gates da 12F verdes.

## Fase 12G — perfil individual do jogador (concluída)

- Autorizada pelo usuário (2026-10-15): abrir um perfil somente leitura num painel lateral, mantendo o elenco visível.
- Plano visual: respeitar identidade dark-green/lime existente. O detalhe memorável fica nos dois ratings (Overall/Potencial) em contraste; restantes metadados apresentados como ficha limpa, sem widgets genéricos. Desktop usa drawer à direita; ecrãs estreitos usam painel inferior; alinhamento à esquerda; foco visível, Escape, restauração de foco.
- Conteúdo a mostrar: nome, clube, overall, potencial, idade, data de nascimento, altura, peso e proveniência. Não haverá edição.
- Gates Windows reportados pelo usuário: `pnpm lint`, `pnpm typecheck`, `pnpm test` (15 arquivos/95 testes), `pnpm build` e `pnpm package:win` PASS.
- Validação manual reportada: painel abre/fecha corretamente em dev e na versão instalada após atualização in-place; campos do perfil e interação confirmados pelo usuário.
- Fase 12G concluída em escopo local. Sem assinatura; não é release público. Nenhuma operação em save do jogo.

## Fase 12H — edição controlada de jogador (concluída em escopo local)

- Escopo aprovado: edição individual de nome, data de nascimento, overall, potencial, altura e peso, validada no domínio e IPC, confirmação explícita, persistência na carreira atual; edição não altera saves/arquivos do jogo.
- Implementação: formulário do perfil com Cancelar/Salvar, confirmação antes de persistir, atualização do estado do perfil e do elenco; escrita escopada pela chave composta lógica `{ id, careerId }` e transacional no processo principal.
- Proveniência da edição é marcada como `USER_ENTERED` / `edited-in-local-manager`; proveniência original é mantida em colunas aditivas separadas (`kind`, `source`, `recordedAt`), incluindo múltiplas edições subsequentes.
- Migration aditiva para bases existentes; validação de entrada também confere data de calendário real, ratings 0–100 e medidas inteiras positivas.
- Salvamento requer confirmação explícita do usuário; Escape e Fechar ficam bloqueados enquanto a escrita está em andamento para evitar perder confirmação/estado visual.
- A migração de proveniência original é aplicada em transação SQLite; inicial e aditiva preservam gravações atômicas.
- Nenhuma operação em save do jogo; o escopo é somente `gerenciador.db`.

## Gates e validação 12H

- Implementação concluída: `squad:update`, allowlist rígida de campos, validação no processo principal, atualização transacional e guarda composta por carreira/jogador; formulário, confirmação, estado de erro e confirmação de sucesso no perfil.
- Adicionado teste de domínio para preservar a proveniência original durante sucessivas edições e teste arquitetural dos limites IPC/migração.
- O usuário reportou que `pnpm typecheck` inicialmente detectou dois erros: conversão de `originalProvenanceKind` para `ProvenanceKind` em `player-profile.ts` e conversão de `originalProvenanceRecordedAt` opcional antes de `new Date()` em `prisma-repositories.ts`. Correções aplicadas nesta sessão: narrowing explícito e normalização `undefined`/`null`.
- Gates Windows reportados pelo usuário após as correções: `pnpm typecheck` PASS, `pnpm lint` PASS, `pnpm test` PASS (16 arquivos/103 testes), `pnpm build` PASS (log enviado em 2026-10-16).
- O usuário confirmou que `pnpm package:win` foi executado e instalado; confirmou edição persistida após fechar/reabrir o app. Captura da instalação mostra a área de dados com rolagem independente e o botão “Editar jogador” fixo e acessível ao final do painel. Confirmação reportada em 2026-10-16.
- Fase 12H concluída em escopo local. Não declarado como release público: instalador não assinado e sem validação em máquina Windows limpa nesta etapa.

## Ligação com o processo principal

- `apps/desktop/electron/main.ts`: abre `gerenciador.db` em `app.getPath('userData')`, aplica a migração inicial na primeira execução e fornece versão via `app.getVersion()`.
- `apps/desktop/electron/career-ipc.ts`: canais allowlist de criação/listagem/abertura, calendário, `squad:list` e `squad:update`; payloads e chaves são validados no limite IPC.
- `apps/desktop/package.json` e `tsconfig.json`: dependências e referências para `@gerenciador/application` e `@gerenciador/database`, além de `@prisma/client`.
- `packages/database/package.json`: `main`, `types` e `exports` apontando para `dist/`.

## Registro histórico de implementação inicial (2026-10-10; superado)

As notas abaixo registram a primeira integração de 12A. Elas são mantidas para rastreabilidade e não descrevem o estado atual do app. Os fluxos foram ampliados nas subfases posteriores; o estado consolidado atual está no cabeçalho e nas seções 12F–12H acima. Referências abaixo a IPC ausente, tela placeholder, banco sem `userData`, gates pendentes ou `bridgeVersion` 2 são snapshots históricos, não pendências atuais.

## Execução manual histórica (2026-10-10)

- Janela do Electron abre; a ponte `window.careerDesktop` existe (o preload foi gerado como CommonJS, `preload.js`, porque o preload sandboxed não aceita ESM).
- Criar carreira pela tela funciona: "Duisburg · 2026/27" aparece na lista.
- Botão “Abrir carreira” em cada linha chama o IPC allowlisted `career:open`, mostra o estado ativo e trata erros; validado manualmente em Windows.
- Atualização corrente adiciona IPC allowlisted `calendar:list`, consulta de fixtures persistidos por carreira e versão dinâmica no cabeçalho (`app.getVersion`). Se vazio, a interface informa que não há jogos e orienta importar; não gera jogos fictícios.
- Gates na versão atual (typecheck, lint, 82 testes, build): PASS no Windows.
- Persistência confirmada pelo usuário: após fechar/reabrir, a carreira “Duisburg · 2026/27” permaneceu na lista.
- Log do processo principal identificou o banco como `C:\\Users\\User\\AppData\\Roaming\\@gerenciador\\desktop\\gerenciador.db` (dentro de `app.getPath('userData')`).
- O startup não reportou erro de migração nem IPC.

## Registro histórico — decisão sobre o teste de segurança da Fase 1

O teste `security-baseline` proibia `ipcRenderer` no preload por verificação de texto. A 12A expõe três wrappers sobre canais fixos (`career:create`, `career:list`, `career:open`), sem repassar `ipcRenderer` ao renderer. Foi trocada a verificação textual por checagens de propósito: o preload não expõe `ipcRenderer` diretamente, não pode receber o nome do canal de fora, e a lista de canais é exatamente a allowlist acima. `bridgeVersion` passou a 2. A mudança foi feita com autorização do usuário.

## Implementação inicial do repositório SQLite — registro histórico

`openCareerStore(caminhoAbsoluto)` em `packages/database/src/career-store.ts`:

- Recusa caminho relativo.
- Recusa arquivo sem a tabela `Career`, sem criar schema por conta própria. A migração versionada continua sendo o único caminho de criação.
- Testes com arquivo temporário cobrem: caminho relativo, banco não migrado e reabertura de uma carreira salva por uma segunda conexão.

Pendência: quem chama precisa aplicar a migração na primeira execução. Esse passo ainda não existe no app.

## Escopo da camada de aplicação inicial — registro histórico

Serviço `createCareerService` em `packages/application/src/career-service.ts`, exportado pelo pacote:

- `createCareer({ name, currentSeason })`: valida nome (1 a 80 caracteres, texto) e temporada (`YYYY/YY`, com o ano final coerente). Id, seed e timestamp são gerados pelo serviço, não aceitos do chamador.
- `listCareers()`: lista as carreiras salvas.
- `openCareer(id)`: reabre por id; rejeita id vazio e id inexistente.

Os testes usam repositório em memória.

## Limitações da primeira entrega — registro histórico, superadas por integrações posteriores

- Nenhum handler IPC no processo principal; o preload continua sem APIs de carreira.
- A tela React continua placeholder.
- Não há ligação com `userData` nem com o banco SQLite do app. O teste de reabertura após reiniciar ainda não existe, porque depende da persistência real.
- Não há teste de integração com Prisma para este serviço.

Por isso a 12A **não** está concluída. Ela está parcialmente entregue: a camada de regras foi verificada, e a parte que faz o fluxo funcionar para o usuário ainda falta.

## Próximos passos da primeira entrega — registro histórico (não são tarefas atuais)

1. Montar o repositório Prisma no processo principal com caminho em `app.getPath('userData')`.
2. Expor `createCareer`, `listCareers` e `openCareer` por canais IPC allowlist, validando entrada no processo principal.
3. Ligar a tela a esses canais e mostrar a lista de carreiras.
4. Testar reabertura com uma nova conexão ao mesmo arquivo SQLite temporário.
