# Proposta da próxima etapa — estabilização pré-release

**Data:** 2026-10-16  
**Estado:** etapa documental 12I autorizada e concluída em 2026-10-16. Nenhuma implementação ou publicação foi autorizada. Resultado: parecer atualizado em `DISTRIBUTION_READINESS.md`; release público continua não aprovado.

## Contexto confirmado

A subfase 12H (edição controlada de jogador) foi concluída em escopo local. O usuário reportou no Windows `pnpm typecheck`, `pnpm lint`, `pnpm test` (16 arquivos/103 testes) e `pnpm build` como PASS. Também confirmou que o pacote Windows foi gerado e instalado, que a edição persiste após fechar e reabrir o aplicativo, e validou visualmente o perfil com rolagem e botão de edição acessível.

A subfase 12C registra o instalador local NSIS x64 e upgrade 0.1.0→0.1.1 validados, mas o pacote não tem assinatura de código e não é release público. O estado atual não confirma teste em máquina Windows limpa, auditoria de segurança/dependências atual, nem revisão final de privacidade, avisos e suporte.

## Recomendação

Proponho uma etapa documental e de validação pré-release (provisoriamente “12I — prontidão de distribuição”), sem alterar código ou gerar/publicar novo instalador até autorização específica. O objetivo seria reconciliar os registros históricos com o produto atualmente integrado e produzir um checklist verificável de release local/público.

Escopo sugerido:

- Inspecionar os status atuais de 12A–12H, `DISTRIBUTION_READINESS.md`, configuração do instalador e recursos existentes; corrigir apenas contradições documentais que estejam comprovadamente obsoletas.
- Definir os critérios e evidências para instalação limpa, upgrade sobre a versão anterior, preservação de `userData`, backup/restauração e desinstalação; deixar claro o que já foi validado e o que ainda requer teste.
- Revisar estaticamente CSP, navegação externa, IPC, validação de entrada, limites de importação, logs e exposição de dados, sem teste ofensivo nem acesso ao save ou processo do jogo.
- Registrar itens de release ainda ausentes ou não aprovados, incluindo assinatura, avisos/licença, política de privacidade, canal de suporte, atualização e rollback.
- Entregar um relatório curto com estado por gate, evidência, pendência e próximo responsável; não declarar release aprovado por inferência.

## Fora de escopo

Esta proposta não autoriza alterações de aplicação, migrações, novas dependências, acesso à rede, assinatura, publicação, integração com EA SPORTS FC/Live Editor, leitura ou escrita de save, nem teste numa máquina limpa. Cada uma dessas ações exigirá autorização e escopo próprios.

## Gate de conclusão sugerido

A documentação deve distinguir claramente `PASS confirmado pelo usuário`, `PASS reexecutado nesta etapa`, `PENDENTE` e `NÃO APLICÁVEL`; todos os itens críticos devem ter evidência ou responsável/ação seguinte. O resultado será apenas um parecer de prontidão, não autorização automática para publicar.

**Decisão necessária:** autorizar ou ajustar a proposta da etapa 12I antes de qualquer trabalho nela.
