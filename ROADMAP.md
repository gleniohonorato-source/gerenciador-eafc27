# Roadmap completo por fases

Este roadmap é planejamento, não autorização. Cada fase requer autorização explícita independente, confirmação dos gates anteriores e definição de escopo. A stack Electron + React + TypeScript + Node.js + SQLite/Prisma permanece fixa, salvo ADR aprovada.

## Fase 0 — Planejamento e arquitetura

Documentar produto, requisitos, domínio, segurança, sincronização, save, simulação, IA narrativa, roadmap e critérios em quinze arquivos. Gate: revisão de consistência dos documentos e registro das limitações. Sem código, dependências ou integração.

## Fase 1 — Fundação técnica

Estruturar monorepo e ambiente, convenções, lint/typecheck/test/build, shell Electron seguro e pacotes vazios. Gate local no Windows: todos os scripts reais passam; confirmar CSP, sandbox, isolation e IPC allowlist. Não declarar PASS sem resultados observados no ambiente alvo.

## Fase 2 — Domínio e persistência

Implementar entidades, value objects, repositórios, esquema/migrações e ciclo de vida de Career, Club, Player, Fixture e FinanceEntry. Gate: invariantes, migração/recuperação em cópia, repositórios testados e domínio independente.

## Fase 3 — Casos de uso e importação local

Criar fluxo manual/importação controlada de elenco e calendário, validação, mapeamento, reconciliação e exportação do formato do aplicativo. Gate: duplicatas e dados inválidos são tratados; nenhuma escrita no save.

## Fase 4 — Motor de mundo e calendário

Implementar eventos de calendário, evolução simplificada, forma/fadiga e avanço determinístico com seed. Gate: repetibilidade, testes de propriedade, logs causais e performance em temporadas representativas.

## Fase 5 — Finanças e gestão

Livro-razão, contratos, orçamento, custos, contratos comerciais e projeções. Gate: reconciliação matemática, moeda explícita, limites e trilha de auditoria.

## Fase 6 — Elenco, academia e saúde simulada

Desenvolvimento juvenil, posições, instalações, lesões simuladas e retorno progressivo. Gate: parâmetros explicáveis, sistemas liga/desliga e validação dos limites; sem aconselhamento médico.

## Fase 7 — Estádio, público e gramado

Assistência, receitas, desgaste, manutenção e projetos de capacidade. Gate: capacidade respeitada, fórmula documentada, análise de sensibilidade e custos coerentes.

## Fase 8 — Interface completa e narrativa opcional

Painéis, propostas de mudança, histórico, relatórios e narrativa baseada apenas em eventos confirmados. Gate: acessibilidade, revisão de UX, nenhum efeito colateral ao navegar e narrativas sem fatos inventados.

## Fase 9 — Sincronização externa de resultados

Escolher fornecedor/fonte e validar cobertura, licença/termos, qualidade, fuso, alterações de calendário e política de dados. Gate separado: importação idempotente, conflitos visíveis, revisão pelo usuário e reversão dentro do app.

## Fase 10 — Estudo de compatibilidade read-only

Pesquisa/PoC isolada para leitura permitida de dados de carreira, se houver mecanismo seguro e autorizado. Gate: matriz de versões, testes em cópias, segurança, documentação; save original permanece intocado. Pode ser cancelada sem bloquear o produto independente.

## Fase 11 — Propostas de edição assistida (condicional)

Somente após estudo de mecanismo, termos, risco, compatibilidade e reversibilidade. Avaliação independente e autorização explícita. Não presume memória de processo, injeção ou escrita de save.

## Fase 12 — Estabilização, distribuição e suporte

Instalador, assinatura, atualizações, migrações, recuperação, documentação e suporte. Gate: checklist de release, teste de instalação/upgrade/desinstalação e política de privacidade.

## Gestão de mudanças

Qualquer alteração de stack, regra de save, integração, escopo online ou dependência de ferramenta externa exige decisão registrada. Fases condicionais não devem ser promovidas por conveniência; o núcleo offline continua sendo a linha de entrega.