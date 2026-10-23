# Fase 11 — especificação de propostas internas de edição assistida

**Data:** 2026-10-10  
**Estado:** ESPECIFICAÇÃO DOCUMENTAL APROVADA — não implementa acesso ao jogo ou edição de save

## 1. Autorização e fronteira

O usuário autorizou somente uma especificação interna de propostas revisáveis no Gerenciador. Esta autorização não permite ler, alterar, patchar, reserializar, substituir ou gravar saves do EA SPORTS FC 27; não permite interagir com o processo ou a memória do jogo; não confirma compatibilidade nem permissão nos termos da EA.

O texto do Contrato do Usuário pt-BR, última atualização 14 de maio de 2026, foi colado pelo usuário e registrado em `COMPATIBILITY_STUDY_FASE_10.md`. A Seção 2 reserva direitos de acesso/cópia/modificação salvo autorização expressa ou permissão legal. A Seção 7(C) define amplamente programas de terceiros que coletam informações do jogo. A interpretação jurídica para qualquer método concreto permanece não verificada. Portanto, a edição de save está fora de escopo e bloqueada.

## 2. O que significa “proposta” aqui

Uma proposta é uma alteração sugerida para o modelo interno do Gerenciador, por exemplo, trocar um valor de orçamento, ajustar um atributo interno de jogador ou atualizar uma data interna. Ela não é um patch, arquivo de instrução para o jogo, diff binário, macro, automação de interface ou mecanismo para alterar o save.

O único destino potencial de aplicação futura é o banco próprio do aplicativo. A existência desta especificação não adiciona botão ou funcionalidade.

## 3. Modelo conceitual de proposta

Uma proposta interna futura deve conter:

- `proposalId` único, `careerId`, entidade e campo-alvo permitidos;
- valor atual observado no estado interno e valor sugerido, ambos tipados e validados pelo domínio;
- motivo textual e origem da sugestão (`USER_REQUEST`, `RULE`, ou `IMPORTED_DATA`), sem alegar fonte externa que não tenha sido validada;
- timestamp, versão da regra que gerou a proposta e estado (`DRAFT`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `APPLIED_INTERNAL`, `STALE`);
- hash do snapshot interno contra o qual a proposta foi criada, para detectar alterações concorrentes;
- recibo de decisão com ator da sessão, decisão, data e valores anteriores/posteriores.

Não incluir caminho de arquivo de save, bytes binários, offsets, endereços de memória, comandos para o jogo nem credenciais.

## 4. Fluxo de revisão futura

1. Criar uma proposta em `DRAFT`; nada é aplicado.
2. Validar formato, invariantes de domínio, limites de faixa e permissões de campo.
3. Apresentar diff claro: valor interno atual, valor sugerido, motivo, origem, riscos e efeitos derivados conhecidos.
4. Exigir confirmação humana explícita para cada proposta ou conjunto homogêneo claramente identificado.
5. No momento da confirmação, comparar hash/snapshot para rejeitar proposta obsoleta; recalcular efeitos e pedir nova revisão se o estado mudou.
6. Aplicar somente ao banco interno, numa transação; gravar auditoria e recibo.
7. Se a escrita interna falhar, fazer rollback transacional. Se houver dependências posteriores, impedir reversão cega e exigir revisão do efeito em cascata.

Navegar, abrir uma proposta ou gerar relatório nunca aplica alterações.

## 5. Rejeição, reversão e auditoria

Rejeitar uma proposta não altera estado. Uma proposta aprovada mas ainda não aplicada pode ser cancelada. Uma alteração aplicada internamente pode ser revertida apenas se o snapshot atual ainda corresponder ao estado pós-aplicação e não houver mudanças dependentes incompatíveis; caso contrário, gerar uma nova proposta compensatória. A trilha é append-only: não apagar o histórico de aprovação/rejeição/aplicação.

## 6. Salvaguardas de arquitetura

- Domínio mantém tipos e invariantes; aplicação produz proposta/diff; persistência grava apenas o estado do app.
- A UI não recebe API genérica de caminhos arbitrários nem acesso ao filesystem privilegiado.
- Nenhum adaptador de escrita terá acesso ao diretório do jogo.
- Nenhuma função, nome de botão, documentação ou marketing pode sugerir “aplicar no save”, “sincronizar para o jogo” ou compatibilidade verificada.
- A especificação não autoriza leitor read-only. A Fase 10 segue documental, e A/B/C permanecem sob as decisões e bloqueios registrados nela.

## 7. Gates para uma futura implementação interna

Antes de implementar propostas internas no Gerenciador: ADR e autorização de escopo, matriz de campos permitidos, teste de stale snapshot, teste de confirmação explícita, testes transacionais de rollback, auditoria append-only, revisão de acessibilidade e segurança, e todos os gates Windows (typecheck, lint, test, build).

Esses gates cobrem somente mudanças no banco interno. Eles não autorizam qualquer integração com o jogo.

## 8. Condições para reabrir qualquer integração com EA FC

Uma proposta de integração com o jogo exige nova decisão separada e, no mínimo: termos específicos vigentes para o título/plataforma conferidos por fonte oficial, avaliação legal independente quando aplicável, mecanismo documentado e autorizado, prova de compatibilidade em ambiente isolado, segurança independente, plano de reversão e garantia de que o save original permanece intocado. Sem todos esses itens, integração e escrita de save permanecem bloqueadas.
