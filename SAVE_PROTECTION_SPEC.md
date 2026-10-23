# Especificação de proteção do save

## Política

O arquivo de carreira original do EA SPORTS FC 27 é protegido contra escrita pelo aplicativo. Não editar, patchar, reserializar, substituir, renomear como parte de uma gravação ou apagar o save. Nenhuma função pode prometer desfazer uma alteração no arquivo do jogo porque a aplicação não o altera.

## Escopo dos dados

Os dados do Gerenciador vivem em banco próprio SQLite e exportações documentadas do próprio aplicativo. A leitura de dados do jogo é uma possibilidade futura, condicionada a método tecnicamente validado, compatibilidade e autorização; nesta fase não existe leitor implementado.

## Regras de desenho

- Separar diretório e tipo de dados do app dos dados do jogo.
- Não manter serviço de escrita com acesso ao diretório de saves.
- Não aceitar caminho arbitrário da UI para operações privilegiadas.
- Leitores futuros usam abertura read-only, validam arquivo, registram versão/hash e nunca salvam sobre a origem.
- Testes usam cópias descartáveis, nunca carreira principal.
- Exportar relatório/backup do app para destino novo, com confirmação e verificação de integridade.
- Nenhum botão “Aplicar no save” deve existir enquanto política permanecer ativa.

## Leitura futura e consentimento

Se um método permitido for identificado: explicar quais dados serão lidos, pedir seleção explícita e consentimento, limitar escopo e não manter dados desnecessários. Compatibilidade é validada por versão; formato desconhecido falha fechado. Nenhum conteúdo executável é aceito.

## Backup e recuperação

O produto protege seus próprios dados com transações, backups versionados e testes de restauração. Recomendar ao usuário que mantenha backup do save segundo seus próprios meios, sem copiar/carregar automaticamente o save do jogo. Não oferecer mecanismo que sobrescreva o original durante recuperação.

## Ameaças e respostas

**Erro de caminho:** operações fora do armazenamento do aplicativo são bloqueadas. **Formato corrompido:** rejeitar e não tentar reparar/substituir. **Atualização incompatível:** manter cópia interna antes de migração e interromper em erro. **Pedido de escrita:** não suportado; comunicar claramente. **Conflito de versão:** desabilitar leitor e preservar dados locais.

## Critérios verificáveis

Auditoria de arquitetura não encontra API de escrita no caminho do save; testes confirmam que importação/leitura não muda hash do arquivo de teste; exportações do app usam extensão/formato próprios; acesso a arquivo requer fluxo privilegiado restrito; documentação e UI distinguem “backup do app” de save do jogo.