# Fase 3 — casos de uso e importação local

**Data:** 2026-10-10  
**Estado:** GATES PASS — install, typecheck, lint, testes (15/15) e build passaram no Windows; limitações documentadas abaixo

## Autorização e escopo

Fase 3 autorizada após confirmação explícita: importação manual/controlada de elenco e calendário, validação, mapeamento/reconciliação e exportação em formato próprio do aplicativo. Save do FC 27 é intocável; sem leitura de save, memória do processo, Live Editor, sincronização de resultados reais ou operação online.

## Implementação desta etapa

Criado o pacote `@gerenciador/application` com formato JSON v1 documentado, validação/normalização pelo domínio, limite de tamanho, verificação de IDs e referências, preview com digest, detecção de duplicata/conflito e exigência de confirmação explícita. A confirmação refaz preview para detectar estado alterado e grava carreira, clubes, jogadores e partidas por repositórios transacionais. Criado adaptador de transaction-scoped repositories no pacote database. Criados testes de unidade para round-trip, formato inválido, referências inválidas, preview, confirmação, conflitos e digest stale; e testes SQLite temporários para commit/rollback.

Exportação produz string JSON e digest. Ainda não existe diálogo de arquivo nem integração UI/IPC; salvar/carregar arquivos por interface fica condicionado a API privilegiada restrita e testes adicionais. O formato é do aplicativo, não do EA FC.

## Verificação no Windows e correções

O usuário reportou `pnpm install` com 7 workspaces: PASS. `pnpm typecheck`: PASS em 6 pacotes/workspaces. `pnpm build`: PASS no estado anterior à atualização completa do workspace e à descoberta das falhas nos novos testes (repetir ao final). `pnpm lint` falhou com import não utilizado e globals TextEncoder/crypto não definidos pelo ESLint; removi o import não usado e substituí APIs globais por `Buffer.byteLength` e `node:crypto` (`createHash`). `pnpm test`: 13/15 passaram; corrigi o cenário de colisão natural de clube para usar ID distinto mas mesmo nome e ajustei o teste de rollback para injetar falha na escrita de Player após a carreira e o clube terem sido gravados, verificando que o rollback os remova. Repetir gates após as correções. O banco do app é local, e arquivos de import/export jamais devem sobrescrever saves do jogo.

## Resultado final no Windows

`pnpm typecheck`, `pnpm lint`, `pnpm test` (15/15 em 5 arquivos) e `pnpm build` passaram. Pendências explícitas: não há ainda UI/IPC para escolher arquivos de importação ou exportação; a gravação do arquivo exportado não foi implementada; o teste de rollback cobre falha de escrita simulada, não queda de processo; e a exportação não inclui finanças nesta versão.

## Histórico de correções

Na segunda rodada no Windows: `pnpm install`, `pnpm typecheck` e `pnpm build` passaram; `pnpm lint` falhou por `node:crypto` e `Buffer` no pacote `application`, que é restrito a independência de plataforma; `pnpm test` falhou em 2 testes. Correções aplicadas: o pacote `application` não importa mais `node:*` nem usa `Buffer`; o digest SHA-256 é injetado pelo adaptador de banco via `configureImportDigest`; o tamanho é limitado por comprimento de string (limite conservador); conflitos agora são verificados antes do digest, para que um conflito não apareça como "dados alterados"; o teste de rollback injeta falha dentro da transação real na escrita de jogadores. Repetir os gates.

## Próximos gates Windows

Na raiz do projeto, execute:

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Confira que o teste de rollback deixa zero entidades após erro. Nenhuma leitura/escrita de save deve ocorrer. Se aparecer erro, envie log completo. A Fase 4 não está autorizada por este trabalho.
