# Fase 12B — backup e restauração

**Escopo autorizado:** backup e restauração manual do banco SQLite próprio do Gerenciador. Sem alteração de schema/upgrade. Nenhuma operação em save do EA FC.

**Estado consolidado:** gates automatizados (typecheck, lint, 87 testes e build) e validação manual de restauração foram reportados como PASS pelo usuário em Windows. A validação manual reportada confirmou que, após restaurar, somente “Duisburg” aparecia, conforme o backup selecionado. Esta evidência é histórica e não foi reexecutada na revisão documental de 2026-10-16. A versão corrente com edição de jogador ainda deve passar pela sequência backup → alteração posterior → restauração em seu pacote final antes de eventual release.

## Implementação registrada

- Backup consistente via SQLite `VACUUM INTO`, para arquivo novo (sem sobrescrever), com manifest JSON lateral (formato/versionamento, timestamp, tamanho e SHA-256).
- Inspeção valida versão do manifest, tamanho, hash SHA-256, `PRAGMA integrity_check` e presença da tabela `Career` antes de oferecer confirmação.
- Restauração exige confirmação explícita do renderer, callback de fechamento das conexões, cópia temporária, verificação antes da troca e preserva o banco anterior como arquivo `.pre-restore-<uuid>.bak`.
- IPC usa canais fixos: selecionar/criar backup e selecionar/confirmar restauração. Diálogos nativos definem o destino/origem; renderer não fornece caminho.
- Ações de backup/restauração foram adicionadas à UI. A confirmação mostra o nome do arquivo e data declarados no manifest; o snapshot do banco atual é preservado.

## Testes automatizados registrados

Testes de integração no banco SQLite temporário cobrem snapshot íntegro e manifest, recusa de overwrite, detecção de adulteração antes de fechar conexões ou tocar no DB ativo, confirmação explícita e restauração com preservação da base anterior. O total de 87 testes foi reportado como aprovado na validação original desta fase.

## Validação pendente para o candidato de release atual

A seção abaixo não invalida retroativamente os gates e o teste manual reportados como PASS na época; define verificações adicionais para a versão atual do pacote e a preparação de release:

- Em um perfil/máquina Windows de teste e com cópia descartável dos dados, criar backup, fazer uma alteração posterior, restaurar o backup e confirmar o estado exato esperado na UI.
- Confirmar que o manifest/hash e a integridade são verificados antes da substituição, e que a cópia `.pre-restore-*` existe após sucesso.
- Executar o fluxo de restauração no pacote exato identificado por versão e SHA-256; registrar resultado sem dados pessoais.
- Teste de interrupção/falha durante a troca só em cópia descartável, se necessário para gate de release; nunca experimentar com o único banco do usuário.

## Registro histórico de pendências (2026-10-10; fechado pelos resultados acima)

A nota inicial dizia que os gates e o teste manual ainda não haviam sido executados, recomendando testar `VACUUM INTO`, exportar, criar uma carreira e restaurar. Isso era o estado provisório de implementação em 2026-10-10. Os resultados reportados posteriormente pelo usuário — gates PASS e restauração manual confirmada — fecharam essas pendências para a versão então validada; a nova validação da versão corrente descrita acima é um gate diferente.
