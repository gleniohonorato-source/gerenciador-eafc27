# Critérios de aceite — Fase 0

## Objetivo

Determinar se o planejamento está suficientemente documentado para solicitar autorização de estrutura técnica. A aprovação deste documento não autoriza a Fase 1.

## Entregáveis obrigatórios

- README, estado do projeto e escopo.
- Arquitetura e requisitos.
- Modelo de domínio e segurança.
- Roadmap completo e registro de decisões.
- Especificação de sincronização de carreira.
- Especificação de proteção do save.
- Especificação do mundo simulado.
- Especificação de narrativa assistida.
- Critérios de aceite da Fase 0 e relatório da Fase 0.

Total: quinze arquivos Markdown separados, contando o README.

## Critérios de conteúdo

1. Stack-base Electron + React + TypeScript + Node.js + SQLite/Prisma é explícita e não trocada silenciosamente.
2. Domain e Simulation são descritos como independentes de UI, framework, Prisma e adaptadores externos.
3. Save original é somente leitura; política proíbe escrita ou sobrescrita.
4. Escopo separa MVP offline de integração condicional com FC 27/Live Editor/dados reais.
5. Fases futuras têm gates e permanecem sem autorização automática.
6. Decisões, requisitos e critérios são consistentes entre documentos.
7. A referência GafferGame/TrueFoot é tratada como inspiração baseada na descrição do usuário, não cópia nem compatibilidade validada.
8. Riscos, premissas, limitações e decisões pendentes são identificáveis.
9. Sincronização/importação inclui proveniência, idempotência, conflito, prévia e confirmação.
10. Simulação é determinística, configurável e auditável; narrativa não muta estado.

## Critérios de processo

Fase 0 não deve adicionar código, dependências, infraestrutura ou integração. Não executar comandos do projeto irmão. A única validação técnica permitida aqui é conferir inventário, nomes, presença de seções e coerência documental; não é validação de software.

## Resultado esperado

PASS somente se todos os quinze documentos estiverem nesta pasta, as checagens documentais passarem e nenhuma decisão inviolável estiver contradita. Caso contrário, BLOCKED com lista objetiva de pendências. O estado deve ser anotado em `RELATORIO_FASE_0.md`.