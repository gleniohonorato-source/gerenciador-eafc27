# Especificação do mundo simulado

## Objetivo

Simular uma carreira e, em fases posteriores, parte do restante do mundo do futebol entre partidas, com causas e regras compreensíveis. O motor cria estado para a experiência do aplicativo; não afirma alterar o jogo ou seu save.

## Princípios

Determinístico por entrada, seed e versão; temporal e reproduzível; parâmetros configuráveis; sistemas independentes que podem ser desligados; limites/invariantes explícitos; separação entre fato, importação, observação e simulação. A simulação não deve tentar imitar logicamente toda a IA interna do FC.

## Ciclo

Receber estado de carreira, intervalo, conjunto de regras e seed → validar precondições → gerar candidatos a eventos → aplicar políticas em ordem estável → produzir ChangeSet e explicação → apresentar prévia → confirmar → persistir eventos no banco do app. Prévia não altera o estado. Comando repetido com mesmo ID é idempotente.

## Sistemas por incrementos

**MVP:** avançar calendário e criar eventos simples de temporada; evolução controlada de atributos selecionados; forma/fadiga conceitual; finanças registradas por lançamento; clube controlado.  
**Posterior:** academia e crescimento juvenil, mudança gradual de posição, lesões/retorno, clubes não controlados, transferências simuladas, assistência, estádio, gramado e clima configurável.

## Regras de evolução

Mudanças por intervalo são limitadas e atribuídas a idade, minutos/treino simulado, potencial e instalação conforme parâmetros publicados. Altura/peso de jovens variam em faixas por idade e não devem saltar de forma implausível. Aprendizagem posicional depende de elegibilidade, tempo e preferência configurável. O app informa que probabilidades são estimativas lúdicas, não previsão real.

## Lesões e retorno

Gerar indisponibilidade com duração/faixa e plano em etapas; reduzir risco de recaída pelo retorno gradual se a regra assim definir. Não produzir diagnóstico ou recomendação clínica. Eventos e fatores são rastreáveis.

## Público, estádio e gramado

Assistência estimada considera capacidade disponível, desempenho/tabela, rivalidade, importância, adversário, dia/horário e tamanho/reputação, com pesos ajustáveis. Não dizer que são os mesmos do produto de referência. Bilheteria deriva de público, preço e regra financeira. Gramado tem desgaste por partidas/clima configurado/manutenção; obras reduzem capacidade durante prazo e têm custo/benefício explícitos.

## Competição e resultados

Resultados de partidas simuladas devem ser opcionais e não interferir em resultados observados/importados sem decisão do usuário. Modo de sincronização não é parte do motor central. Tabelas só são recalculadas a partir de resultados com origem clara.

## Aleatoriedade controlada

Usar PRNG injetável e seed persistida; ordenar entradas de forma estável. Toda atualização registra versão do motor, regras, seed, intervalo e estado de origem. Mudança de algoritmo cria versão nova; eventos passados não são recalculados silenciosamente.

## Validação e métricas

Testar determinismo, limites, conservação financeira, capacidades, juventude e progressão temporal; teste de propriedades com múltiplas seeds; cenários longos e análise de sensibilidade. Expor parâmetros e razão do evento, não uma falsa precisão científica. Controles por sistema e perfil de realismo são requisito.