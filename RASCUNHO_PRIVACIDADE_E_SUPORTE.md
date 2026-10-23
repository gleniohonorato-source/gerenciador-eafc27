# Rascunho para revisão — privacidade, dados e suporte

**Estado:** rascunho de decisões para produto local; não é política publicada, aconselhamento jurídico ou promessa comercial. Elaborado em 2026-10-16. Requer confirmação do responsável pelo produto e revisão apropriada antes de disponibilização pública.

## Resumo do produto e do escopo verificado

O Gerenciador EA FC 27 é um aplicativo desktop de carreira. A revisão estática do código atual observou persistência SQLite em `userData`, importação local por seletor nativo, criação de backup e logs de inicialização. A configuração do instalador preserva `userData` ao desinstalar. Não foi identificada nesta inspeção uma integração de telemetria ou envio de dados do jogador/carreira para servidor, mas isso é uma constatação limitada ao código inspecionado, não uma verificação de tráfego em runtime nem uma garantia sobre futuras versões.

O app é independente e não declara compatibilidade, afiliação ou endosso da EA SPORTS. A política do projeto proíbe escrita no save do jogo; o uso do save real e da memória/processo do jogo está fora do escopo suportado.

## Proposta conservadora (requer aprovação)

**Armazenamento local.** Carreiras, elenco, calendário, configurações e dados importados ficam no banco SQLite próprio dentro do diretório de dados do aplicativo no dispositivo do usuário. Não salvar esses dados em arquivos de save do EA SPORTS FC. Os arquivos de backup são criados no caminho escolhido pelo usuário e podem conter dados da carreira; o usuário deve guardá-los como dados pessoais e protegê-los.

**Rede e telemetria.** Proposta: não coletar telemetria nem enviar conteúdo da carreira para servidores. Relatos de erro enviados pelo usuário devem ser voluntários e conter apenas o material que o usuário escolher compartilhar. Esta proposta ainda requer confirmação do produto e verificação de runtime do tráfego de rede antes de publicar qualquer promessa “offline”/“sem telemetria”.

**Logs.** O app atualmente pode gravar `startup.log` local em `userData` para diagnóstico. O log pode incluir mensagens de erro, stack traces, caminhos de arquivos e detalhes técnicos. Proposta: manter logs locais, não enviar automaticamente, fornecer instrução de localização/exportação somente após revisar conteúdo e remover dados pessoais antes do compartilhamento. Período de retenção, rotação e mecanismo de exclusão ainda precisam ser decididos.

**Backup, exportação e exclusão.** O app oferece backup/restauração manual do banco. Os arquivos externos de backup não são apagados automaticamente quando o app é desinstalado. Política de retenção e instrução para exclusão definitiva de dados e cópias de backup ainda precisam ser formalizadas.

## Suporte e incidentes — decisões abertas

Canal oficial de suporte: **DECISÃO NECESSÁRIA** (não inventar e-mail, URL ou horário de atendimento). Responsável por atendimento: **DECISÃO NECESSÁRIA**. Prazo de resposta/SLA: **não prometido**. Idiomas suportados: **DECISÃO NECESSÁRIA**.

Para um relato de problema, solicitar versão do app, sistema operacional, passos para reproduzir e texto de erro. Logs e banco/backup só devem ser pedidos quando necessários, com consentimento explícito; fornecer opção de ocultar nomes, caminhos e demais dados antes de compartilhar. Nunca solicitar save original do jogo, credenciais ou acesso remoto desnecessário.

Procedimento provisório de incidente: interromper a distribuição do artefato afetado; identificar a versão/hash; orientar usuário a preservar banco e backups; não orientar reparo manual do save do jogo; documentar impacto e mitigação; retomar somente após validação técnica e aprovação do responsável.

## Confirmações necessárias antes de publicar

- Confirmar se o app não faz chamadas de rede ou telemetria em todas as configurações suportadas, incluindo runtime empacotado.
- Confirmar os dados exatos persistidos/importados, finalidade, localização, controles e caminhos de exportação/exclusão.
- Definir política de logs: conteúdo, rotação, retenção, acesso e exclusão.
- Definir canal/contato de suporte, responsáveis, idiomas e limites de atendimento.
- Definir política de privacidade aplicável, entidade responsável, jurisdição, versão/data e processo de revisão; não publicar este rascunho sem revisão humana/legal.
- Revisar licença do produto, avisos de terceiros e atribuições separadamente.

## Declaração de estado

Este texto é um rascunho interno para decisão. Não afirmar que é uma política final nem que já descreve todas as práticas de produção. Não constitui autorização para publicação ou coleta de dados.
