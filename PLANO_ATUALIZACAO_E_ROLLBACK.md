# Proposta — atualização e rollback do aplicativo Windows

**Estado:** proposta operacional; não implementada nem aprovada para distribuição. Preparada em 2026-10-16. Não representa promessa de atualização automática.

## Situação observada

O desktop é empacotado como instalador NSIS x64 pelo electron-builder. A configuração atual declara `deleteAppDataOnUninstall: false`; o banco de carreira reside em `app.getPath('userData')`. O usuário reportou upgrade in-place 0.1.0→0.1.1 e preservação de dados. Não foi confirmada nesta revisão uma configuração de auto-update, feed, canal de distribuição ou assinatura. O pacote de validação 0.1.1 não é assinado e não deve ser tratado como release público. Em 2026-10-16, o usuário atualizou Electron 44.8.0, electron-builder/electron-builder-squirrel-windows 26.15.3, electron-vite 6.0.0, Vite 8.3.4, plugin React 6.1.2 e Vitest 5.0.5; typecheck/lint/build/103 testes foram reportados PASS. `pnpm audit` ainda reporta 2 findings e nenhum instalador novo foi gerado/testado.

## Princípios propostos

1. Atualização não deve tocar nos saves do jogo nem sobrescrever a base própria sem backup verificável.
2. Manter backups independentes do instalador e da máquina atual; update/rollback só em cópias de teste até o plano ser aprovado.
3. Antes de cada artefato, registrar versão, arquitetura, SHA-256, origem, assinatura/publisher e os resultados dos gates que correspondem exatamente àquele build.
4. Não remover automaticamente `userData` ao atualizar, desinstalar ou reverter; preservar o banco e oferecer instruções explícitas.
5. Se migração/restauração falhar, parar, manter cópia do estado anterior e logs minimizados; não tentar editar SQLite ou save do jogo manualmente.

## Fluxo manual proposto para releases futuros

**Antes:** validar typecheck/lint/test/build; revisar dependências/licenças e segurança; gerar pacote em ambiente controlado; assinar conforme política aprovada; calcular SHA-256 e verificar assinatura; guardar instalador e manifesto de release imutáveis.

**Upgrade:** criar backup do banco pelo app e guardar `.db` + manifest fora de `userData`; fechar o app; instalar a nova versão sobre a anterior; iniciar e validar migrações, versão, abertura de carreira, calendário, elenco, edição e backup. Fazer rollout primeiro a um grupo de teste; só ampliar após aprovação.

**Rollback:** não presumir que instalar versão antiga sobre banco migrado é seguro. Fechar o app, preservar uma cópia de todo o `userData`, instalar o artefato anterior aprovado e restaurar apenas um backup produzido antes da migração, se a compatibilidade do schema tiver sido comprovada. Se não existir backup compatível, interromper e escalar para suporte; nunca apagar nem recriar a base automaticamente.

**Desinstalação:** usar o desinstalador padrão. A configuração atual pretende preservar `userData`, mas o usuário deve manter backup externo; verificar o comportamento em VM antes de comunicar isso como compromisso. Instalador e cópias de backup são separados: desinstalar o app não remove backups que o usuário guardou em outros locais.

## Gatilhos de bloqueio

Bloquear o rollout se assinatura/hash falhar, se faltar qualquer gate do build, se migração alterar ou perder dados, se backup/restore falhar, se o app não iniciar, se `userData` for removido inesperadamente, ou se houver incidente de segurança. Preservar evidências e dados de teste; não distribuir até análise e aprovação.

## Decisões necessárias

- Distribuição: site/canal, responsáveis e controle de acesso.
- Certificado de assinatura, publisher, custódia da chave e rotação.
- Atualização manual ou mecanismo automático; se automático, feed, TLS, validação de assinatura, política de rollout e opt-in/consentimento.
- Política de versões suportadas, janela de manutenção, changelog e notificação de breaking changes.
- Compatibilidade de schema entre downgrade/rollback e estratégia de migrações reversíveis.
- Processo de recuperação e canal de suporte; limites de atendimento e resposta.
- Retenção de instaladores, checksums, logs de validação e backups.

## Limites

Este documento não instala serviço, não configura auto-update, não assina, não cria release nem autoriza distribuição. Requer decisão do responsável pelo produto e validação técnica em VM descartável antes de implementação. Publicação requer autorização específica separada.
