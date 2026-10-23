# Escopo do projeto

## Visão

Criar um gerenciador desktop de carreira que complemente a Carreira de Treinador do EA SPORTS FC 27 no PC com uma camada persistente de administração e simulação. O produto deve proporcionar profundidade sem depender de acesso interno ao jogo e sem modificar o save original.

## Usuários e contexto

Jogadores que mantêm uma carreira de treinador e querem acompanhar decisões de clube, evolução de atletas, finanças, infraestrutura e acontecimentos entre partidas. O público inicial é usuário de PC, modo offline. Não é ferramenta oficial da EA e não deve implicar afiliação.

## Objetivos

1. Manter um registro de carreira estruturado e legível, independente do arquivo de save.
2. Simular mudanças de mundo com regras configuráveis, rastreáveis e reproduzíveis.
3. Oferecer gestão de elenco, desenvolvimento, finanças, instalações, estádio e calendário em módulos incrementais.
4. Explicar o que cada ação muda antes da confirmação e manter histórico de alterações reversíveis dentro do aplicativo.
5. Manter uma fronteira opcional para importação de dados ou leitura do jogo, sempre isolada e inicialmente somente leitura.

## Dentro do escopo conceitual

- Cadastro/importação controlada de carreira, clube, competições, jogadores, contratos e calendário.
- Evolução de elenco e jovens, adequação de posições, fadiga, lesões simuladas e retorno gradual.
- Finanças por livro-razão, contratos comerciais, orçamento, custos e compromissos.
- Academia, instalações, estádio, público e desgaste de gramado por fatores explicáveis.
- Simulação do restante do mundo em nível configurável, além do clube controlado.
- Livro de eventos, perfis de realismo, pausa/avanço por período, comparação de cenários e narrativa opcional.
- Prévia, confirmação, auditoria e reversão de mudanças que estejam sob controle do aplicativo.

## Fora do escopo inicial

- Escrita/edição binária do save do FC 27 ou restauração automática sobre o arquivo original.
- Leitura de memória de processo, injeção, contorno de anti-cheat ou integração online.
- Promessa de suporte a Live Editor ou qualquer API não comprovada.
- Sincronização de partidas reais sem licença/termos validados e sem fonte compatível.
- Cópia de marca, interface, texto, código, assets ou fórmulas proprietárias de terceiros.
- Diagnóstico médico real; previsões são somente mecanismos de simulação.
- IA com autonomia para alterar estado da carreira ou inventar fatos.

## Definição de MVP recomendada

Núcleo offline independente do jogo: criar e manter uma carreira interna, importar dados estruturados sob validação, consultar elenco/calendário/finanças, avançar uma simulação determinística pequena, inspecionar eventos e exportar/recuperar dados do aplicativo. Integração externa não é requisito do MVP.

## Limites e premissas

A compatibilidade com FC 27 e Live Editor requer pesquisa técnica e teste futuro. O lançamento do produto e disponibilidade do jogo não são tratados como fato neste documento. Toda funcionalidade dependente do jogo está sujeita a gate próprio. A carreira interna não deve ser confundida com a base oficial de dados nem com o save.

## Medidas de sucesso

Usuário consegue configurar uma carreira sem integração; repetir a mesma simulação com os mesmos dados e semente obtém o mesmo resultado; toda mudança mostra procedência e impacto; saldos fecham com o livro-razão; recuperação de dados internos é testada; nenhum caminho escreve no save do jogo.