# Modelo de domínio inicial

## Princípios de modelagem

Este modelo descreve a carreira interna do aplicativo, não o formato do save EA FC. Identificadores são internos e estáveis. Todo dado registra proveniência e período temporal. Entidades não conhecem Electron, React, Prisma, APIs externas nem formatos binários do jogo.

## Entidades

**Career:** identidade, nome, clube controlado, temporada corrente, calendário, conjunto de regras ativo e seed.  
**Club:** identidade, nome exibido, país, liga, reputação/tamanho configurável, estádio e situação financeira.  
**Competition:** tipo e regras resumidas, temporada, clubes participantes e calendário.  
**Season:** período e estado de carreira; não pressupõe calendários reais completos.  
**Fixture:** competição, equipes, horário local e fuso quando conhecido, estado, resultado opcional e origem.  
**Player:** ID interno, nome exibido/importado, idade/ano de nascimento se disponível, atributos suportados, posições, altura/peso quando disponíveis e proveniência.  
**Contract:** jogador/clube, prazo, salário simulado, cláusulas e moeda.  
**SquadAssignment:** vínculo temporal entre jogador, elenco, posição e papel.  
**SimulationRuleSet:** versão, perfil, parâmetros, seed e sistemas habilitados.  
**WorldEvent:** evento datado com categoria, origem, entidades afetadas, causa, parâmetros e resultado.  
**FinanceEntry:** valor em unidade mínima, moeda, direção/categoria, data, estado, contraparte e origem.  
**Facility / Academy:** nível, capacidade, custo, prazo de obra e efeitos de regra.  
**Stadium:** capacidade nominal/disponível, condição, projeto de expansão, naming agreement simulado.  
**InjuryEpisode / ReturnPlan:** lesão simulada, janela estimada, etapas de retorno e risco definido pela regra.  
**ExternalDataImport:** fonte, instante de importação, versão, hash opcional, mapeamentos, conflitos e status.  
**ChangeProposal:** estado anterior/proposto, impactos calculados, autor, confirmação, execução/reversão.

## Value objects

Money (minorUnits + currency), LocalDate/Instant com fuso explícito, PlayerAttributes com limites por perfil, CompetitionKey, Provenance, RuleVersion, Seed, Availability, AttendanceEstimate e ChangeSet. Validar ao construir; não aceitar NaN, infinito, moeda ausente ou faixas inválidas.

## Proveniência

Valores devem ser classificados: USER_ENTERED, IMPORTED_EXTERNAL, READ_FROM_GAME, SIMULATED ou DERIVED. Armazenar origem específica, timestamp e confiança/qualidade quando aplicável. Valores derivados referenciam os dados de entrada e versão da fórmula.

## Invariantes essenciais

- Jogador não pode estar simultaneamente em dois clubes no mesmo vínculo temporal.
- Saldo financeiro é derivado da soma das entradas, nunca mantido como verdade divergente.
- Público não excede capacidade efetivamente disponível.
- Idade, atributos, datas, moedas e capacidades são validados.
- Resultado de partida é nulo até observação/importação/simulação confirmada.
- Evento persistido não pode ser sobrescrito sem trilha; correção cria compensação/novo evento.
- Aplicar uma proposta confirmada é idempotente pelo ID de comando.
- Simulação com a mesma entrada/seed/regra produz o mesmo conjunto de eventos.

## Agregados e limites

Career é raiz para configurações e ciclo de vida da carreira; Club é agregado para instalações e orçamento local; Competition/Season controla calendário; Player concentra estado individual e vínculo contratual separado; FinanceAccount projeta entradas do livro-razão. Contextos externos não recebem entidades de domínio mutáveis diretamente: usam DTOs validados e transformadores.

## Decisões abertas

Definir identidade de jogador quando fonte externa não tem ID estável; política de fusão de duplicatas; granularidade diária versus por rodada; moedas e câmbio; retenção de eventos; e suporte a múltiplas carreiras. Essas decisões devem ser fechadas antes da Fase 2, sem inventar compatibilidade do jogo.