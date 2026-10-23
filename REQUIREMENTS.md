# Requisitos do produto

## Convenções

Prioridades: MUST (necessário ao MVP/segurança), SHOULD (importante, pode ser posterior), COULD (opcional). Requisitos externos de jogo são condicionais e não representam compatibilidade confirmada.

## Funcionais

**FR-01 — Carreira interna (MUST):** permitir criar, identificar, salvar, reabrir, arquivar e exportar uma carreira pertencente ao aplicativo.  
**FR-02 — Dados de elenco (MUST):** representar clube, competição, temporada, jogador, atributos selecionados, posições e contrato com validação.  
**FR-03 — Calendário (MUST):** registrar partidas, datas, competições e estado do resultado; distinguir agenda importada, inserida pelo usuário e simulada.  
**FR-04 — Livro-razão (MUST):** registrar receita/despesa com moeda, valor inteiro em unidade mínima, categoria, data, origem e referência; saldo é soma verificável.  
**FR-05 — Simulação (MUST):** avançar período explicitamente e produzir eventos com versão de regra e seed, sem efeitos escondidos.  
**FR-06 — Histórico (MUST):** consultar antes/depois, ator/origem, motivo e instante de cada mutação interna.  
**FR-07 — Proposta de mudança (MUST):** exibir estado atual, proposto, impactos e riscos antes de confirmar ação relevante.  
**FR-08 — Desfazer (SHOULD):** permitir reversão para mudanças do próprio aplicativo quando não houver dependência posterior; informar quando uma ação não for reversível.  
**FR-09 — Configuração (MUST):** ligar/desligar sistemas e selecionar perfil de realismo com parâmetros válidos e versionados.  
**FR-10 — Desenvolvimento juvenil (SHOULD):** evolução e crescimento em limites plausíveis, dependente de idade e regra explícita, sem crescimento instantâneo arbitrário.  
**FR-11 — Lesões e retorno (SHOULD):** simular indisponibilidade e plano de retorno progressivo; não oferecer conselho médico real.  
**FR-12 — Gestão ampliada (SHOULD):** representar instalações, academia, estádio, assistência, gramado, patrocínios e obrigações financeiras.  
**FR-13 — Narrativa (COULD):** resumir eventos existentes; não cria nem grava fatos.  
**FR-14 — Importação de dados reais (COULD/condicional):** somente após aprovação da fonte/termos, mostrar correspondências e alterações antes de aplicar.  
**FR-15 — Leitura de dados do save (COULD/condicional):** nunca escrever; precisa de compatibilidade, revisão e gate próprios.

## Não funcionais

**NFR-01 Segurança:** renderer isolado e IPC allowlisted; arquivos externos são não confiáveis.  
**NFR-02 Proteção:** nenhuma função do produto escreve no save original.  
**NFR-03 Determinismo:** mesma entrada, seed e versão de regras gera a mesma transição.  
**NFR-04 Auditabilidade:** fatos observados, importados, simulados e decisões do usuário permanecem distinguíveis.  
**NFR-05 Recuperação:** dados próprios podem ser exportados/recuperados; migrações têm estratégia de backup e teste.  
**NFR-06 Acessibilidade:** navegação por teclado, foco visível, contraste adequado, linguagem clara.  
**NFR-07 Manutenibilidade:** Domain e Simulation sem dependências externas; regras testáveis isoladamente.  
**NFR-08 Privacidade:** armazenamento local por padrão; coleta opcional e minimizada se existir telemetria futura.

## Regras de negócio

- Dinheiro representa inteiros em unidade mínima e sempre identifica moeda.
- Não existe mutação implícita disparada ao abrir uma tela.
- Todo evento gerado inclui origem, data simulada, versão da regra e referência à carreira.
- Importação duplicada deve ser detectada e reconciliada, não somada silenciosamente.
- Ações com impacto relevante exigem confirmação explícita.
- A interface não declara integração ativa enquanto adaptador não estiver habilitado e validado.

## Critérios gerais

Cada requisito deve mapear a caso de uso e critério de aceite antes de implementação. Requisitos condicionais não entram no MVP automaticamente. Mudança no escopo é registrada em `DECISIONS.md` e requer aprovação.