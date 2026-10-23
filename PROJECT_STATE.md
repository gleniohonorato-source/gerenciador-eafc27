# Estado do projeto

**Data-base:** 2026-10-16  
**Pasta:** `Gaffer Tools EAFC27`  
**Estado desta raiz:** fases 1–9 com gates reportados nos status por fase; Fases 10–11 documentais. Fase 12H de edição controlada de jogador concluída em escopo local: gates Windows (`typecheck`, `lint`, 103 testes, `build`), pacote instalado e persistência após reabertura confirmados pelo usuário; validação visual do painel rolável confirmada. Revisão documental 12I atualizada em 2026-10-16; backup/restore e rejeição de cópia corrompida na VM descartável reportados como PASS. Atualização de dependências em curso: Electron 44.8.0, electron-vite 6.0.0, Vite 8.3.4, Vitest 5.0.5 e electron-builder 26.15.3; usuário reportou typecheck/lint/build PASS e 103 testes PASS. `pnpm audit` ainda tem 2 findings (1 high Prisma/deepmerge-ts, 1 moderate electron-builder/sprintf-js); instalador não refeito nem testado. Revisão independente Git e licenças/SBOM pendentes. Release público NÃO APROVADO. Consulte `DISTRIBUTION_READINESS.md` e `CHECKLIST_VALIDACAO_WINDOWS_PRE_RELEASE.md`.

## Resumo

O Gerenciador EA FC 27 é um aplicativo desktop complementar para aprofundar a gestão de carreiras de treinador. O foco aprovado para o planejamento é um núcleo independente do jogo: carreira, elenco, calendário, finanças, eventos persistentes, desenvolvimento e simulação de mundo. Recursos inspirados na descrição de GafferGame/TrueFoot foram analisados como categorias de produto, sem copiar identidade, ativos, texto, código ou fórmulas.

## Estado por fase

| Fase | Estado | Observação |
|---|---|---|
| Fase 0 — planejamento e arquitetura | DOCUMENTADA NESTA PASTA | Pacote de quinze documentos; verificar critérios e consistência no relatório. |
| Fase 1 — estrutura técnica | PASS | Gates no Windows reportados como aprovados (typecheck, lint, 3 testes, build) e janela Electron abriu; consulte `PHASE_1_STATUS.md`. |
| Fase 2 — domínio e persistência | GATES PASS | Typecheck, lint, 9 testes, build e Prisma migrate passaram; backup/restore ainda sem teste dedicado. Consulte `PHASE_2_STATUS.md`. |
| Fase 3 — casos de uso e importação local | GATES PASS | Typecheck, lint, 15 testes e build passaram no Windows; sem UI/IPC para seleção de arquivos. Consulte `PHASE_3_STATUS.md`. |
| Fase 4 — calendário e avanço determinístico | GATES PASS | Typecheck, lint, testes, build passaram no Windows. Consulte `PHASE_4_STATUS.md`. |
| Fase 5 — livro-razão e orçamento | GATES PASS | Typecheck, lint, 35 testes, build passaram no Windows; persistência/auditoria de orçamento pendentes. Consulte `PHASE_5_STATUS.md`. |
| Fase 6 — elenco e saúde básica | GATES PASS | Typecheck, lint, 45 testes, build passaram no Windows; integração/persistência ainda pendentes. Consulte `PHASE_6_STATUS.md`. |
| Fase 7 — capacidade e receita de público | GATES PASS | Typecheck, lint, 52 testes e build passaram no Windows; sem gramado, manutenção ou lançamento automático. Consulte `PHASE_7_STATUS.md`. |
| Fase 8 — histórico e relatório textual | GATES PASS | Typecheck, lint, 58 testes e build passaram no Windows; sem painéis, propostas ou modelo de linguagem. Consulte `PHASE_8_STATUS.md`. |
| Fase 9 — sincronização local de resultados | GATES PASS | Typecheck, lint, 72 testes e build passaram no Windows; apenas arquivo local, sem fornecedor externo, persistência ou tela de revisão. Consulte `PHASE_9_STATUS.md`. |
| Fase 10 — estudo de compatibilidade read-only | DOCUMENTADA | Nenhum código nem acesso ao jogo; contrato geral EA fornecido pelo usuário registrado, termos específicos e formato continuam não verificados. Consulte `COMPATIBILITY_STUDY_FASE_10.md`. |
| Fase 11 — propostas internas assistidas | ESPECIFICAÇÃO DOCUMENTAL | Escopo autorizado apenas para propostas no banco interno; nenhuma integração ou escrita de save. Consulte `PHASE_11_ASSISTED_EDIT_SPEC.md`. |
| Fase 12A/12D/12E/12F/12G/12H — interface, calendário, elenco | GATES 12H PASS; PACOTE PENDENTE | Gates Windows reportados: typecheck, lint, 103 testes e build aprovados. Falta `pnpm package:win` e validação visual manual da edição no instalador. Consulte `PHASE_12A_STATUS.md`. |
| Fase 12B — backup/restauração | GATES PASS | Backup verificado e restauração manual confirmada; consulte `PHASE_12B_STATUS.md`. |
| Fase 12C — pacote local Windows x64 | PASS (validação local) | Upgrade in-place 0.1.0→0.1.1 manteve “Duisburg”; app/Prisma, backup/restauração e uninstall/reinstall passaram. Não assinado; não é release público. Consulte `PHASE_12C_STATUS.md`. |

Este estado pertence somente a esta raiz. O projeto irmão `GERENCIADOR_EA_FC_27` é distinto e não foi usado como substituto ou fonte executável.

## Stack e fronteiras

Stack-base planejada: Electron, React, TypeScript, Node.js e SQLite/Prisma. Tauri permanece apenas como alternativa sob avaliação, sem troca silenciosa. DOMAIN e SIMULATION são módulos puros, sem dependências da UI, Electron, persistência ou integração externa.

## Restrições invioláveis

- O save real do EA SPORTS FC 27 nunca será escrito, reserializado ou sobrescrito pelo produto.
- Nenhuma alegação de compatibilidade com FC 27 ou Live Editor é considerada comprovada por este documento.
- Integração futura, se autorizada, começa com prova de conceito isolada e leitura somente; usar cópias de teste, nunca a carreira principal.
- Não operar em modos online nem contornar mecanismos de integridade.
- Não executar fase subsequente apenas porque o documento está concluído.

## Riscos e bloqueios

Acesso técnico ao estado interno do jogo, leitura confiável e compatibilidade por versão não foram comprovados. Dados reais de partidas exigem fornecedor, cobertura e autorização de uso apropriados. A página de referência citada não pôde ser acessada nesta sessão; a análise externa disponível se baseia na descrição fornecida pelo usuário.

## Fonte de verdade

Os documentos desta Fase 0 definem o escopo e as decisões para esta pasta. Se houver divergência com a implementação futura, abrir decisão/alteração de escopo e obter aprovação antes de mudar as fronteiras fundamentais.