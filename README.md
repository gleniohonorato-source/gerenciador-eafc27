# Gerenciador EA FC 27

Aplicação desktop planejada para ampliar a gestão e a simulação de uma carreira de treinador no EA SPORTS FC 27 para PC. O produto deverá oferecer uma carreira complementar, com regras configuráveis, mundo futebolístico persistente, finanças, desenvolvimento de atletas e histórico explicável.

## Estado nesta pasta

Este diretório é a nova raiz de planejamento. A Fase 0 está sendo reconstituída como documentação, sem código, dependências ou integração ao jogo. A pasta não contém a implementação do projeto irmão `GERENCIADOR_EA_FC_27`; não executar nem copiar arquivos dele sem pedido explícito. A Fase 1 e qualquer fase posterior dependem de autorização própria.

## Princípios essenciais

O domínio e a simulação não dependem de Electron, React, Prisma, adaptadores ou do jogo. A stack-base permanece Electron + React + TypeScript + Node.js + SQLite/Prisma. O save original do jogo é somente leitura estrutural: nenhum arquivo de carreira será editado ou sobrescrito pelo aplicativo. A integração com EA FC 27, Live Editor e dados reais é opcional e não pode ser prometida antes de prova de viabilidade e revisão de segurança.

Toda alteração simulada deve ser pré-visualizável, confirmada pelo usuário e auditável. O mundo simulado distingue claramente dados importados, observados e gerados pelo motor.

## Documentos da Fase 0

A especificação completa está dividida em quinze documentos: `PROJECT_STATE.md`, `PROJECT_SCOPE.md`, `ARCHITECTURE.md`, `REQUIREMENTS.md`, `DOMAIN_MODEL.md`, `SECURITY.md`, `ROADMAP.md`, `DECISIONS.md`, `CAREER_SYNC_SPEC.md`, `SAVE_PROTECTION_SPEC.md`, `WORLD_SIMULATION_SPEC.md`, `AI_NARRATIVE_SPEC.md`, `ACCEPTANCE_CRITERIA_FASE_0.md` e `RELATORIO_FASE_0.md`, além deste README.

`PROPOSTA_GERENCIADOR_EAFC27_INSPIRADA_GAFFER.md` é uma análise complementar, não uma autorização de implementação nem substituto desta especificação.

## Estado atual da Fase 1

As Fases 1–9 tiveram seus gates automatizados reportados como aprovados no Windows; consulte `PROJECT_STATE.md` e os respectivos `PHASE_n_STATUS.md` para escopo e limitações. A Fase 10 está documentada sem código de acesso ao jogo. A Fase 11 tem apenas uma especificação de propostas internas, sem integração ou escrita de save. Termos específicos do EA SPORTS FC 27 e formato de save continuam não verificados; consulte `COMPATIBILITY_STUDY_FASE_10.md` e `PHASE_11_ASSISTED_EDIT_SPEC.md`.