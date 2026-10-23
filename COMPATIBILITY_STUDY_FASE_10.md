# Estudo de compatibilidade read-only — Fase 10

**Data:** 2026-10-10
**Estado:** ESTUDO DOCUMENTAL — nenhum código de acesso ao jogo ou ao save foi escrito. Decisões de implementação permanecem bloqueadas.

## 1. Premissas fixas do projeto

Estas regras já estão em `ACCEPTANCE_CRITERIA_FASE_0.md` e `ARCHITECTURE.md`, e o estudo não as altera:

- O save original é somente leitura. Nenhuma escrita, sobrescrita ou substituição é permitida.
- Qualquer adaptador que interaja com processo ou jogo exige estudo separado, testes em ambiente isolado e autorização específica.
- A política de proteção do save prevalece sobre qualquer outra conveniência.
- GafferGame/TrueFoot é inspiração de produto, não compatibilidade validada.
- O formato de exportação do aplicativo (`CAREER_PACKAGE_FORMAT.md`) não é formato do jogo e não substitui saves.

## 1A. Fonte primária de termos fornecida pelo usuário

O usuário colou nesta conversa o texto do **Contrato do Usuário da EA em português (Brasil)**. O cabeçalho informa “Última atualização: 14 de maio de 2026”. URL apresentada no conteúdo: [Contrato do Usuário da EA — pt-BR](https://www.ea.com/pt-br/legal/user-agreement). Data em que o usuário acessou/copio o texto: não informada. O conteúdo foi fornecido pelo usuário; a página não foi buscada nem aberta diretamente nesta sessão.

Trechos relevantes conforme o texto colado:

- **Seção 2, Licença:** “Exceto quando expressamente autorizado pela EA ou quando for permitido por lei, você não poderá acessar, copiar, modificar nem distribuir nenhum Conteúdo, Direito ou Serviço EA”. Também proíbe engenharia reversa ou tentativa de extrair/usar código-fonte ou outros dados dos Serviços EA, exceto quando expressamente autorizado ou permitido por lei.
- **Seção 7(C), Monitoramento e Medidas Antitrapaça:** tecnologias de detecção “podem monitorar e coletar dados do seu jogo, da memória RAM ou de outros tipos de memória, processos, imagens, comunicações e armazenamento de arquivos do seu dispositivo”. A definição de “Programa Não Autorizado de Terceiros” inclui software que a EA acredita que “intercepta, ‘mina’ ou coleta, de qualquer outra forma, informações do jogo ou por meio dele”.
- **Seção 7(A):** tentar burlar, desativar ou adulterar medidas técnicas encerra a licença.
- **Seção 14:** a EA pode alterar o contrato; o uso continuado após mudanças constitui aceitação. A data de atualização deve ser conferida novamente antes de qualquer decisão futura.

Interpretação prudente para o projeto, não parecer jurídico: a redação é ampla e não apresenta uma exceção explícita para ferramenta externa read-only que leia saves. O mecanismo C (leitura da memória de processo) permanece excluído. O mecanismo B (ler cópia de save) não pode ser tratado como permitido com base neste texto; permanece bloqueado sem autorização oficial específica ou avaliação jurídica. O mecanismo A (importar exportação oficial) só pode avançar se a exportação existir e os termos do recurso a permitirem. A Seção 2 deixa exceção para o que a EA autorizar expressamente ou a lei permitir, mas o estudo não determina o alcance jurídico dessa exceção.

## 2. Verificações ainda não realizadas

Mesmo com o texto primário fornecido, permanecem sem verificação:

- Se há termos suplementares específicos de EA SPORTS FC 27, plataforma ou modo de jogo que alterem ou complementem o contrato geral.
- A estrutura, criptografia ou compressão dos arquivos de save de qualquer versão.
- A existência de uma API ou exportação oficial de dados de carreira.
- O comportamento do jogo após atualizações de patch.
- A interpretação jurídica das cláusulas para uma ferramenta read-only concreta.

Não foi feita inspeção técnica de arquivos, processo ou memória do jogo; nenhum código de acesso foi criado.

## 3. Mecanismos possíveis e avaliação

| Mecanismo | Descrição | Risco principal | Reversibilidade | Decisão nesta fase |
|---|---|---|---|---|
| A. Importação manual de exportação oficial | O usuário usa uma função do próprio jogo ou aplicativo para exportar dados e entrega o arquivo ao Gerenciador | Não se sabe se o jogo oferece exportação oficial de carreira (não verificado); se oferecer, o formato pode mudar | Alta: arquivo é apenas entrada, validada pela Fase 3 | **Candidato preferencial condicionado** à existência da exportação oficial e à verificação de termos |
| B. Leitura de cópia de save feita pelo usuário | O usuário copia o save manualmente; o Gerenciador lê a cópia | Formato não documentado; risco legal não verificado; pode quebrar em patch | Média: a cópia pode ser descartada | Bloqueado até verificação de termos e formato |
| C. Leitura de memória de processo em execução | Ler dados do processo do jogo enquanto ele roda | Alto: risco de termos, segurança e instabilidade; viola a premissa de não interagir com processo | Baixa | **Excluído**. Requer estudo separado e autorização específica, e não é recomendado |
| D. API oficial, se existir | Consumo de um serviço oficial de dados | Depende de existência e de termos | Alta | Não verificado; registrar apenas se o fornecedor for confirmado |

## 4. Matriz de compatibilidade por versão

| Versão do jogo | Mecanismo testado | Resultado | Data | Observação |
|---|---|---|---|---|
| EA SPORTS FC 27 | Nenhum | Não testado | — | Nenhum teste realizado nesta fase |

Nenhuma linha foi preenchida com sucesso porque nenhum teste foi executado. Isso é intencional.

## 5. Critérios de aceite para uma futura PoC

Uma PoC só pode começar quando todos estes itens estiverem registrados:

1. Verificação dos termos oficiais vigentes para o título e plataforma, com link, data de acesso e trecho relevante; texto geral pt-BR fornecido pelo usuário em 2026-10-10 não basta para resolver permissibilidade.
2. Mecanismo escolhido na matriz, com decisão explícita e autorização separada.
3. Ambiente isolado, sem acesso ao save original; testes apenas em cópias.
4. Matriz de versões preenchida com resultados reais.
5. Plano de reversão: como remover o adaptador sem afetar dados do aplicativo.
6. Gate de segurança revisado por responsável que não seja o autor da PoC.

## 6. Recomendação

Investigar primeiro se existe uma exportação oficial de carreira e quais termos específicos se aplicam. Se confirmada e permitida, priorizar essa via, que não toca o save e reaproveita a validação da Fase 3. O mecanismo C deve ser descartado. O B permanece bloqueado: o Contrato do Usuário fornecido não demonstra que a leitura externa de cópia seja permitida.

Esta recomendação não autoriza implementação. A Fase 10 só avança para PoC com autorização separada.
