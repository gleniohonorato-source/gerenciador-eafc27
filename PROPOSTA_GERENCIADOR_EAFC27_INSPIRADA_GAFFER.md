# Gerenciador EA FC 27 — Proposta de evolução

**Documento de análise e recomendação**  
**Data:** 9 de outubro de 2026  
**Status:** Proposta de produto e arquitetura — não autoriza implementação de fases

## Resumo executivo

A recomendação é evoluir o Gerenciador EA FC 27 como uma aplicação desktop de carreira, não tentar reproduzir literalmente o GafferGame nem prometer integração com o EA SPORTS FC 27 antes de comprovar compatibilidade. A proposta combina as ideias descritas pelo usuário sobre GafferGame/TrueFoot com o escopo já definido do projeto: um motor de carreira configurável, simulação determinística, ferramentas de gestão, narrativa opcional e uma camada de integração isolada.

A principal vantagem competitiva deve ser a confiança: mostrar previsões e mudanças antes de aplicar, exigir confirmação, manter histórico e permitir desfazer quando seguro. O save original do jogo permanece protegido; qualquer edição do save deve ser estritamente evitada. Integração ao vivo, leitura de memória, Live Editor e suporte a FC 27 ficam condicionados a análise técnica, segurança, compatibilidade, regras aplicáveis e autorização explícita de fase.

A fonte de requisitos da referência, neste documento, é a descrição fornecida pelo usuário. A página gaffergame.com não pôde ser acessada pelo mecanismo de pesquisa desta sessão por restrição de rede; portanto, as funcionalidades atribuídas ao produto de referência abaixo não foram verificadas independentemente.

## 1. Objetivo do produto

Construir uma ferramenta de desktop que torne uma carreira de treinador mais viva e administrável, permitindo ao usuário configurar, acompanhar e simular sistemas de clube ao longo das temporadas. A ferramenta deve ser útil mesmo sem conexão ao jogo; integrações externas devem ser adaptadores opcionais e substituíveis, e não dependências do domínio.

**Público inicial:** jogadores de EA SPORTS FC 27 para PC, no modo Carreira de Treinador, que desejam maior profundidade administrativa e controle do universo da carreira. A disponibilidade real de qualquer integração com o FC 27 ainda precisa de prova de conceito.

**Princípios:** proteger o save; apresentar procedência e impacto das mudanças; manter domínio e simulação independentes da interface e de adaptadores; oferecer comportamento previsível e auditável; permitir configuração de regras; evitar automação silenciosa.

## 2. Análise da referência e oportunidade

Pelo conteúdo apresentado, a referência organiza a experiência em cinco eixos: mundo autônomo com desenvolvimento de jogadores e rotação de equipamentos; sincronização de resultados reais com competições da carreira; atmosfera, público, gramado e estádio; gestão financeira, médica e de academia; e edição em tempo real do elenco, tática e condições da partida. Também destaca fórmulas explicáveis, pré-visualização de alterações, botão de desfazer, uso de Live Editor e operação sobre o jogo em janela sem bordas.

Essas ideias são valiosas como referência de produto, mas não devem ser copiadas em identidade, código, textos, ativos, fórmulas proprietárias ou interface. O produto próprio deve adotar nome, marca, linguagem visual, regras e implementação independentes. A compatibilidade concreta das alegações de suporte a FC 27, Live Editor e funções descritas deve ser verificada em ambiente apropriado; não foi possível validá-la nesta análise.

A lacuna mais promissora para o Gerenciador é transformar os sistemas em uma simulação coerente e explicável que funcione primeiro de forma independente. Em vez de começar pela edição ao vivo, começar pelos dados, regras, histórico e proteção. Em vez de depender de resultados reais para dar vida à carreira, oferecer um mundo simulado próprio e tornar qualquer sincronização externa opcional, configurável e sujeita a confirmação.

## 3. Escopo funcional recomendado

### 3.1 Núcleo de carreira e mundo vivo

O usuário configura uma carreira, clube, competições, calendário e regras. O motor simula eventos entre partidas: evolução de atletas, adaptação de posições, crescimento físico de jovens em faixas plausíveis, forma, fadiga, lesões e retorno gradual, moral e decisões de elenco. Cada evento deve ter causa, data, parâmetros e resultado consultáveis. A simulação deve poder avançar um dia, uma rodada ou um período, com pausa, repetição determinística e opção de desativar cada sistema.

A simulação de clubes não controlados pode ser introduzida após a validação do modelo de dados, usando regras simplificadas e limites configuráveis. A prioridade é consistência entre temporadas, não tentar recriar toda a lógica interna do jogo.

### 3.2 Gestão do clube

Livro-razão financeiro com receitas e despesas categorizadas, orçamento e projeções; contratos comerciais e de uniforme; patrocínio; pré-temporada; custos de instalações; taxas competitivas; empréstimos e obrigações; e orçamento para transferências. Valores e compromissos devem ter origem, data, condição e impacto visível. O módulo médico pode incluir instalações, plano de retorno e estimativa de risco como apoio de simulação, nunca diagnóstico real. A academia pode ter níveis de instalação, custos e efeitos explícitos sobre probabilidades de desenvolvimento.

### 3.3 Estádio, público e gramado

Modelo de assistência com fatores configuráveis e explicáveis, como capacidade disponível, tamanho e reputação do clube, desempenho recente, posição, rivalidade, importância do jogo, força do adversário, dia e horário. Clima só deve ser fator se houver dado confiável ou se for fornecido pelo usuário. Receita de bilheteria deve derivar de público, preço e regras de receita, sem atribuir precisão real quando forem apenas estimativas.

O gramado pode ter desgaste por calendário e condições configuradas; melhorias podem alterar recuperação, custo de manutenção e qualidade estimada. Expansões de estádio devem ter orçamento, prazo, assentos temporariamente indisponíveis, capacidade incremental e efeito financeiro. Direitos de nome são um registro de negócio simulado; qualquer alteração dentro do jogo só poderá ser proposta após validar o mecanismo técnico e obter confirmação explícita.

### 3.4 Sincronização de futebol real — opcional e posterior

Tratar a sincronização como um módulo de importação de dados de terceiros, desligado por padrão. Antes de qualquer uso: confirmar licenciamento e termos do fornecedor, cobertura e qualidade das competições, fuso horário, adiamentos, partidas canceladas, duplicidade, conflitos com o calendário do save e método de mapeamento de clubes. O sistema deve mostrar diferenças, origem, horário da última atualização e uma prévia por partida. Nenhum resultado é aplicado sem confirmação; deve haver registro de importação e mecanismo de reversão para dados controlados pelo aplicativo.

Não assumir que qualquer API, feed ou fonte pública permite redistribuição ou uso comercial. Se a autorização ou qualidade da fonte não estiver clara, oferecer importação manual ou manter a carreira inteiramente simulada.

### 3.5 Edição e interface ao vivo — oportunidade, alto risco

A edição de atributos, estilos de jogo, posições, contrato, aparência, chuteiras, tatuagens, corpo, tática, capitão, jogadas ensaiadas, horário, clima, nome de estádio, câmera e velocidade de jogo pode ser desejável, mas é a área com maior dependência técnica. Não a incluir como promessa de MVP.

Projetar desde o início uma interface de propostas de alteração: estado atual, novo estado, impacto esperado, origem e controles de aceitar/cancelar. A execução deve ocorrer por adaptador versionado, com validação do alvo e retorno de resultado. Até que exista uma API autorizada e estável e uma prova de conceito isolada, disponibilizar a experiência como protótipo de dados, não como edição real. Não escrever diretamente em memória do processo, não contornar mecanismos de segurança/anti-cheat, nem modificar o save original. Qualquer futura integração com Live Editor requer revisão específica de segurança e compatibilidade.

## 4. Diferenciais próprios

O primeiro diferencial é um **Painel de Impacto**: cada ação mostra valores anteriores e propostos, dependências, custos, consequência provável e reversibilidade antes de qualquer aplicação. O segundo é um **Livro de Eventos** que permite entender por que o mundo mudou e reproduzir a simulação a partir de uma configuração e semente. O terceiro é o **Modo Seguro/Simulação**, no qual o usuário experimenta regras e projetos em uma cópia interna, sem tocar no jogo. O quarto é a **política de proteção do save**: nenhuma escrita no arquivo original, backups ou modo de leitura antes de qualquer futura ponte externa.

Outros diferenciais recomendados são perfis de realismo (arcade, equilibrado e rigoroso), ajustes por liga e temporada, dados offline, calibração de fatores e explicação de incerteza, além de um painel de qualidade dos dados. A narrativa deve ser opcional e baseada nos eventos persistidos; não pode inventar resultados ou alterar o domínio por conta própria.

## 5. Priorização de produto

**MVP de domínio:** gestão de uma carreira sem integração com o jogo; cadastro/importação controlada de clube, elenco e calendário; evolução simplificada; finanças; eventos e histórico; configurações de regras; exportação dos dados do próprio aplicativo; testes determinísticos.

**Versão seguinte:** simulação de clubes adicionais, lesões e retorno, academia, público e estádio, compromissos financeiros, ferramentas de comparação de cenários e relatórios de temporada.

**Depois de comprovar compatibilidade:** leitura de carreira por adaptador documentado, primeiro em modo somente leitura; pré-visualização e reconciliação de dados; integração com o jogo por mecanismo permitido, testada em ambiente separado. Edição ao vivo somente após avaliação técnica e autorização própria.

**Candidatos a alfa:** novos sistemas experimentais identificados como instáveis e desativados por padrão. **Candidatos a beta:** funções com esquema de dados estável, migração, testes, documentação e recuperação validados. Os termos alfa/beta devem refletir maturidade real, não apenas disponibilidade.

## 6. Arquitetura recomendada

Manter a stack-base já decidida: Electron, React, TypeScript, Node.js e SQLite/Prisma. O domínio e a simulação permanecem puros e independentes de Electron, React, Prisma, Live Editor e FC 27. A camada de interface comunica com processos privilegiados somente por IPC restrito e validado. A persistência usa repositórios e migrações, não é acessada diretamente pelo domínio. Adaptadores de importação, dados reais e integração com o jogo ficam em módulos separados com contratos explícitos.

Fluxo lógico: UI → casos de uso → domínio/simulação → portas de persistência e integração → adaptadores. O motor recebe estado e comandos, devolve eventos e projeções; relógio, aleatoriedade e fontes externas são injetados para permitir testes reproduzíveis. Integrações devem ter versões, timeouts, validação de entrada, logs sem dados sensíveis e desligamento seguro.

Segurança da aplicação: renderer sem Node integration, context isolation e sandbox habilitados, CSP restritiva, IPC por allowlist, validação de esquema em toda entrada, dependências auditadas e atualização assinada quando disponível. O caminho de dados do jogo deve ser explicitamente read-only. Nunca importar ou executar arquivos recebidos sem validação; não tratar dados externos como instruções confiáveis.

## 7. Modelo de domínio inicial

Entidades candidatas: Career, Club, Competition, Season, Fixture, Player, Contract, SquadAssignment, Facility, Stadium, FinanceAccount, FinanceEntry, InjuryEpisode, TrainingPlan, SimulationRuleSet, WorldEvent, ExternalDataImport e ChangeProposal. Cada objeto precisa de identidade estável dentro do aplicativo e proveniência. Valores monetários devem usar unidade mínima inteira e moeda explícita; datas armazenadas com regra de fuso; atributos e limites devem ser validados no domínio.

A camada de eventos precisa distinguir fatos observados/importados de eventos simulados e decisões do usuário. Nunca misturar silenciosamente essas categorias. Identificar fontes, versão da regra e instante da simulação para explicar resultados passados.

## 8. Riscos e controles

**Compatibilidade do FC 27:** ainda não comprovada. Controle: spike técnico em cópia/ambiente de teste, leitura isolada e matriz de versão; nenhuma promessa de edição até relatório de viabilidade.

**Corrupção ou perda de carreira:** controle: proibição de escrita no save original, backup e validação em qualquer experiência futura de integração; recuperação testada.

**Dependência de Live Editor:** controle: adaptador opcional e substituível, sem acoplamento ao domínio, documentação de permissões e revisão da origem do software.

**Direitos e termos de resultados reais:** controle: aprovação de fornecedor e licença antes de publicar ou distribuir sincronização; importação manual como alternativa.

**Falsa precisão em cálculos:** controle: fatores e fórmulas documentados, parâmetros ajustáveis, intervalos ou rótulo de estimativa, testes de sensibilidade.

**Escopo excessivo:** controle: MVP funcional sem integração ao jogo, gates de fase e priorização por evidência.

**Mudanças externas de jogo/ferramentas:** controle: matriz de compatibilidade, testes por versão, feature flags e degradação graciosa.

**Regras de plataforma e uso online:** controle: escopo exclusivo offline/Carreira de Treinador; não interagir com modos online nem contornar controles de integridade.

## 9. Roadmap proposto por gates

Este roadmap é uma proposta e não substitui a autorização de fase já acordada no projeto. A fase atualmente registrada na memória deve ser confirmada nos documentos presentes no workspace antes de continuar. Nenhuma fase posterior está autorizada por este documento.

**Fase 0 — planejamento e arquitetura:** considerada concluída no histórico do projeto. Preservar os 15 documentos originais como fonte de verdade; anexar esta proposta como análise complementar, não sobrescrevê-los.

**Fase 1 — estrutura técnica:** o histórico informa execução estrutural offline e gates finais pendentes no Windows local. Antes de ampliar escopo, confirmar estado atual e resultados locais; não afirmar PASS sem execução real dos gates prescritos.

**Fase 2 — domínio e persistência de carreira:** validar entidades, casos de uso, migrações, importação controlada e proteção dos dados internos. Gate: testes de domínio e integração aprovados, migração reversível e nenhum acoplamento de UI na simulação.

**Fase 3 — motor de simulação:** calendário, eventos, evolução e finanças determinísticas. Gate: repetibilidade, invariantes, cenários de regressão e explicação de fatores.

**Fase 4 — interface de carreira e auditoria:** dashboards, Painel de Impacto, histórico, configurações e propostas de mudança. Gate: usabilidade e acessibilidade verificadas; nenhuma mudança silenciosa.

**Fase 5 — mundo multiclupe e instalações:** academia, lesões, público, estádio e gramado. Gate: fórmulas documentadas, testes de sensibilidade e performance em temporadas completas.

**Fase 6 — dados externos:** seleção e aprovação de fonte, importação, reconciliação e histórico. Gate: autorização de uso verificada, tratamento de adiamentos e conflitos testado.

**Fase 7 — compatibilidade de leitura do jogo:** somente após prova de conceito segura e autorizada. Gate: matriz de versões, leitura sem escrita, testes com saves de cópia e documentação de falhas.

**Fase 8 — propostas de edição assistida:** apenas se mecanismo técnico, legalidade/termos, segurança e reversibilidade estiverem demonstrados. Gate e autorização separados; não está presumida no escopo.

**Fase 9 — estabilização e distribuição:** testes de instalação/atualização/recuperação, telemetria opt-in e minimizada, documentação, suporte e compatibilidade. Gate: release checklist aprovado.

## 10. Critérios de aceite do conceito

A proposta é considerada pronta para discussão técnica quando: a fronteira entre simulação interna, dados reais e dados lidos do jogo está clara; a proteção do save é explícita; nenhuma integração não validada é prometida; cada alteração sensível tem pré-visualização e confirmação; sistemas podem ser desligados individualmente; regras e fatores são rastreáveis; estados simulados são reproduzíveis; e os gates de fase respeitam a autorização explícita do usuário.

Para um futuro MVP, além disso: criar e reabrir uma carreira interna sem FC 27; avançar a simulação de forma repetível; registrar entradas financeiras e calcular saldo corretamente; visualizar elenco, calendário, eventos e histórico; exportar e recuperar os dados do aplicativo; executar os gates de TypeScript, lint, testes e build no ambiente previsto, sem substituí-los por verificações alternativas não autorizadas.

## 11. Pendências que exigem validação

1. Conferir os 15 documentos da Fase 0 e o status real de Fase 1 no workspace selecionado, que apareceu vazio nesta sessão.
2. Obter acesso permitido à página de referência ou considerar a descrição do usuário como única fonte da comparação externa.
3. Confirmar a disponibilidade e compatibilidade do FC 27/Live Editor no ambiente do usuário, sem usar a carreira principal.
4. Definir a primeira unidade de valor do MVP: gestão/simulação independente, leitura de save ou integração ao vivo. A recomendação deste documento é gestão e simulação independentes.
5. Definir se sincronização de resultados reais será mantida como requisito ou como extensão opcional dependente de licenciamento.

## Recomendação final

Prosseguir com a evolução do Gerenciador EA FC 27 como produto original, usando a referência como inspiração de categorias de funcionalidade, não como especificação técnica. Priorizar um núcleo offline, determinístico e auditável, mais um sistema forte de prévia/histórico/desfazer. Manter sincronização real e edição ao vivo como extensões condicionais, nunca como premissas do MVP. Preservar a stack e as fronteiras de arquitetura já aprovadas e solicitar autorização específica antes de iniciar qualquer fase de implementação.

---

**Nota de fontes:** análise baseada na descrição da referência fornecida pelo usuário. A tentativa de abrir https://gaffergame.com/#idea foi bloqueada pela allowlist de rede desta sessão. O vídeo, a página do Career Engine, o Hub e o Patreon não foram verificados independentemente. Não se afirma aqui que as funções descritas funcionem no EA SPORTS FC 27.
