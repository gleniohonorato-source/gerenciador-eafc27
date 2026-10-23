# Formato de intercâmbio de carreira — v1

## Finalidade e limites

Este é um formato de propriedade do Gerenciador para exportar/importar dados internos do aplicativo. Não é formato EA SPORTS FC, não é compatível com arquivos de save e não deve ser usado para editar ou substituir saves. A versão 1 é JSON UTF-8, até 5 MiB, com esquema fechado e validação antes de persistir.

## Estrutura

A raiz contém `format: "gerenciador-eafc-career"`, `version: 1`, `exportedAt`, `career`, arrays `clubs`, `players` e `fixtures`. As entidades têm IDs internos estáveis. Dados com origem incluem `provenanceKind`, `provenanceSource` e `provenanceRecordedAt`. Valores monetários não são exportados nesta versão; finanças permanecem no livro-razão interno até evolução do formato.

## Regras

Campos requeridos, timestamps, enumerações, valores numéricos e relações passam por validação de domínio. IDs duplicados, clube controlado inexistente, jogador vinculado a clube ausente e partidas com clubes ausentes invalidam o pacote. Resultados de partida requerem proveniência pela invariável do domínio. Formato/versão desconhecidos falham sem executar conteúdo.

A prévia calcula um digest e conflitos contra registros existentes. Mesma identidade com conteúdo diferente, ID usado por conteúdo divergente e jogo com identidade natural conflitante são exibidos. Sem política de resolução aprovada, qualquer conflito impede confirmar a importação. A confirmação exige boolean explícito e digest igual ao da prévia; o caso de uso recalcula o preview contra o estado atual antes de persistir.

## Importação e atomicidade

A sequência é ler conteúdo do arquivo no limite permitido → validar JSON/estrutura → normalizar pelas fábricas do domínio → verificar referências e duplicatas internas → mapear e gerar prévia → confirmar explicitamente → salvar em uma transação SQLite → devolver recibo com importId e contagens. A transação usa repositórios vinculados à transação Prisma; falha em qualquer escrita reverte todo o lote. A carreira é inicialmente salva sem `controlledClubId`, clubes são inseridos, e a referência do clube controlado é aplicada em seguida para respeitar as chaves estrangeiras.

O chamador deve obter o arquivo por diálogo nativo e entregar somente texto ao caso de uso. Caminhos não são aceitos no renderer ou no domínio. A camada de interface/IPC ainda não está conectada nesta fase. Exportação retorna texto JSON e digest para o chamador; gravar arquivo será responsabilidade de um adaptador privilegiado futuro, que deve criar arquivo novo em destino confirmado, nunca apontar ao save do jogo.

## Extensão

Mudanças incompatíveis exigem `version` nova e migrador explícito. Não adicionar campos de confiança, código executável, scripts, caminhos ou credenciais. CSV pode ser considerado posteriormente com mapeamento explícito por coluna; não faz parte desta v1.