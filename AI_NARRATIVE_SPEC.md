# Especificação de narrativa assistida

## Objetivo e limite

Oferecer resumos opcionais que tornem eventos da carreira mais legíveis, sem ser fonte de verdade e sem alterar estado. A narrativa descreve fatos já existentes no Livro de Eventos; não simula resultados nem toma decisões.

## Entradas permitidas

Somente DTOs mínimos e validados: eventos confirmados, nomes de apresentação, datas, resultados/projeções identificados por origem e preferência de idioma/tom. Não enviar identificadores pessoais, caminhos locais, tokens ou conteúdo arbitrário do filesystem. Dados não confirmados não são apresentados como fatos.

## Saída

Texto curto, atribuído a “resumo gerado”, com referências internas aos eventos de origem. Se não houver eventos, indicar ausência de novidades em vez de preencher com invenção. Saída não cria WorldEvent, FinanceEntry, resultado ou alteração de jogador.

## Salvaguardas

- Gerador é adaptador opcional; domínio continua funcional sem IA.
- Validar formato/limites e escapar conteúdo antes de renderizar.
- Tratar nomes e textos de importações como dados, não instruções.
- Não aceitar ferramentas com permissão de escrita ou execução.
- Mostrar origem dos fatos e permitir regenerar/remover resumo.
- Evitar alegações médicas, financeiras ou factuais sem apoio no evento.
- Não usar identidade/citação de pessoas reais como se tivessem dito algo.

## Privacidade e falhas

Modo local/offline deve manter alternativa baseada em templates. Se serviço externo vier a ser avaliado, exigir opt-in, divulgação do que é transmitido, minimização e retenção definida. Falha, falta de rede ou saída inválida retorna erro legível e não bloqueia carreira.

## Critérios de aceite futuros

Para um conjunto de eventos conhecido, o resumo não acrescenta fatos sem suporte; cada afirmação pode ser rastreada; saídas malformadas são rejeitadas; modo sem IA funciona; narrativa não altera estado de domínio; usuário controla geração e persistência.