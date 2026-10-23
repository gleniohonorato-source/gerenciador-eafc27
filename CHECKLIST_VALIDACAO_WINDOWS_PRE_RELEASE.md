# Checklist Windows — validação pré-release

**Versão do roteiro:** 1.0  
**Data:** 2026-10-16  
**Finalidade:** orientar validação do instalador local e do backup/restauração em ambiente descartável. Este checklist não aprova publicação, não substitui revisão de segurança e não autoriza acesso/modificação de saves ou processos do jogo.

## Segurança dos dados — antes de começar

Faça todos os testes em uma VM/conta Windows de teste ou ambiente descartável, com carreira fictícia. Antes de qualquer uninstall, restore ou troca de versão, crie uma cópia externa do banco próprio do Gerenciador e do respectivo manifest. Não use a carreira principal como dado de teste. Se algum passo falhar, pare e preserve a pasta `%APPDATA%\@gerenciador\desktop`; não apague nem substitua manualmente o banco. O restore destrói/substitui o estado ativo, então só deve ocorrer após cópia confirmada.

## Identidade do artefato — preencher antes de instalar

- Versão exibida no app: ____________________
- Nome do instalador (`Setup ... .exe`): ____________________
- SHA-256 do instalador: ____________________
- Arquitetura/target: Windows x64 / NSIS (confirmar)
- Data/hora local do build: ____________________
- Origem/caminho do artefato: ____________________
- Assinatura: ausente / presente; detalhes e publisher: ____________________
- Windows edition/build e arquitetura da máquina/VM: ____________________
- Resultado executado por e data: ____________________

**Artefato 0.1.1 atualizado — falha de startup (2026-10-16):** o usuário reportou `pnpm package:win` com Electron 44.8.0/electron-builder 26.15.3 NSIS x64; SHA-256 `F8B3093A33485FAFB47E8C95E3417626A0B1B26560D84CB62F00F8B8391D99C0`; `Get-AuthenticodeSignature` = `NotSigned`. Em tentativa de abertura na VM, a aplicação falhou no processo principal: `SyntaxError: Identifier 'require' has already been declared`. Inspeção do bundle apontou colisão entre shim `const require` do bundler Vite 8 e `var require` produzido pela variável `require` de `packages/database/src/prisma-client.ts`. Correção aplicada na fonte: renomear a variável local para `prismaRequire`. O usuário reportou após essa correção `pnpm typecheck`, `pnpm lint`, `pnpm test` (16 arquivos/103 testes) e `pnpm build` PASS em 2026-10-17. O artefato com hash acima está inválido para uso; não repetir teste com ele.

**Novo artefato (2026-10-17):** `pnpm package:win` concluído em Windows com Electron 44.8.0/electron-builder 26.15.3, NSIS x64. Nome: `Gerenciador EA FC 27 Setup 0.1.1.exe`; SHA-256 reportado `781683D2516EE1F8FB98F37B3B4C92FF08F18C665A9447B5CA23805B3F99B4C2`. Authenticode continua `NotSigned`, sem publisher. Após cópia do runtime para recurso separado, usuário confirmou que o app abriu normalmente e deixou a carreira atual aberta. Também confirmou que criou backup, fechou e reabriu o app, restaurou esse backup e confirmou a persistência dos dados. Como smoke test de edição no build atual, renomeou Jonas Weber para “Jonas Weber Teste”, fechou/reabriu e confirmou que a alteração persistiu (captura após reabertura). Esses são PASS reportados pelo usuário para startup, banco/carreira, backup/restore e edição persistente no build atual; não equivalem a validação de instalação limpa, upgrade/desinstalação ou release público.

**Registro inicial anterior (2026-10-16):** usuário confirmou que o SHA-256 então usado coincidiu com o instalador 0.1.1 anterior, que o ambiente era descartável e que “Duisburg” era carreira fictícia. Captura confirmou app aberto e versão 0.1.1. Esse resultado se refere ao hash antigo, não ao artefato atualizado listado acima.

**Registro de backup (2026-10-16):** usuário confirmou que os arquivos de backup e manifest foram criados e que o app informou sucesso. Hash/tamanho do backup ainda não foram comparados independentemente.

**Preparação e resultado de restore (2026-10-16):** usuário confirmou que a carreira fictícia foi alterada após o backup, que a restauração foi concluída e que “Duisburg” voltou ao estado salvo, removendo a alteração posterior. Usuário confirmou que a cópia `.pre-restore-*` foi preservada. Arquivo não aberto nem inspecionado nesta sessão.

**Teste de cancelamento e rejeição (2026-10-16):** usuário confirmou que o fluxo de restauração foi cancelado normalmente e a carreira permaneceu no estado alterado; assim, o snapshot não substituiu a base ativa ao cancelar. Em seguida, uma cópia duplicada do backup, com conteúdo alterado, foi rejeitada e o usuário confirmou que a carreira ativa permaneceu inalterada. O backup original e o manifest devem permanecer preservados.

Para calcular o hash no PowerShell, use `Get-FileHash -Algorithm SHA256 -LiteralPath <caminho-do-instalador>` e registre o resultado sem modificar o instalador.

## A. Instalação limpa em ambiente descartável

1. Confirme que o perfil de teste não contém dados anteriores do Gerenciador. Se houver instalação antiga, não remova dados manualmente: use uma VM limpa ou registre e preserve separadamente a pasta de dados.
2. Instale o artefato identificado acima. Registre prompts do Windows/SmartScreen e se o instalador identifica claramente publisher/assinatura.
3. Abra o app. Confirme título, versão visível, ausência de diálogo/erro e criação do banco em `userData` esperado. Se não iniciar, pare; salve `startup.log` e a mensagem completa, removendo dados pessoais antes de compartilhar.
4. Crie uma carreira de teste fictícia com temporada válida; feche e reabra o app e confirme que ela aparece e pode ser aberta.
5. Importe apenas o arquivo JSON de teste do projeto. Revise a prévia, confirme, e verifique contagem e dados de calendário/elenco; repita com Cancelar e confirme que nada foi gravado pela operação cancelada.
6. Abra perfil, edite um valor de teste, confirme, feche/reabra o app e verifique persistência e registro de origem anterior. Não use um dado pessoal ou valor da carreira real.
7. Role o painel do perfil em ambas as direções; confirme que cabeçalho/fechar e botão de ação permanecem utilizáveis, que o foco de teclado é visível e Escape fecha quando não há gravação em andamento.
8. Registre PASS/FAIL por etapa, screenshot sem informação pessoal e erros relevantes. Não marque sucesso por uma janela aberta apenas.

Resultado A: ____________________  Evidências/observações: ____________________

## B. Backup e restauração na versão candidata

Use somente a carreira fictícia da etapa A.

1. Crie um backup por meio do app. Preserve o arquivo `.db` e o manifest JSON lateral juntos, em local externo à pasta de dados do app.
2. Confirme que o backup e o manifest existem, que o app informou sucesso e que tamanho/hash registrados correspondem aos arquivos. Mantenha uma cópia intacta.
3. Faça uma alteração reversível na carreira de teste (por exemplo, altere nome ou valor de jogador) e confirme que a mudança aparece.
4. Inicie a restauração a partir do backup da etapa 1. Confirme visualmente o nome/data do backup e aceite o diálogo explícito somente depois de conferir a cópia externa.
5. Após concluir, reabra/recarregue a carreira e confira que o estado voltou ao snapshot do backup e que a alteração posterior não está mais presente.
6. Verifique que o mecanismo preservou uma cópia pré-restauração `.pre-restore-*` na pasta de dados. Não abra nem modifique manualmente o SQLite durante esse teste.
7. Em um segundo teste com uma cópia descartável, selecione um backup alterado/inválido ou cancele a confirmação; confirme que o banco ativo permanece inalterado. Não adulterar o único backup guardado.
8. Se testar interrupção durante troca de arquivos, faça-o apenas em VM e em cópia descartável; jamais em dados reais. Não é obrigatório simular falha se não houver ambiente isolado seguro.

Resultado B: ____________________  Evidências/observações: ____________________

## C. Upgrade e desinstalação (somente se houver nova versão)

A validação histórica 0.1.0→0.1.1 foi reportada como PASS. Para qualquer novo instalador candidato, repetir em VM/cópia descartável: instalar sobre a versão anterior sem desinstalar; verificar a versão nova, carreira, elenco, calendário e edição; fazer backup; desinstalar pela interface padrão sem marcar opção de apagar dados; reinstalar e confirmar que `userData` persiste. Se uma etapa falhar, interromper e preservar logs/dados. Não executar esse bloco sobre o perfil principal.

Resultado C: ____________________  Evidências/observações: ____________________

## D. Fechamento e evidências

- [ ] Os logs de `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` estão associados ao mesmo commit/pasta/versão do artefato.
- [ ] A identidade do artefato (versão, nome, SHA-256, arquitetura e assinatura) está registrada.
- [ ] Instalação limpa foi concluída ou marcada como bloqueada, com detalhes reproduzíveis.
- [ ] Backup/restauração foram executados com carreira fictícia e cópia externa protegida.
- [ ] Upgrade/uninstall foram feitos somente se aplicáveis e com dados descartáveis.
- [ ] Nenhum save ou processo do EA SPORTS FC foi aberto, lido, alterado ou usado em teste.
- [ ] Screenshots/logs foram revistos e não contêm nomes, caminhos pessoais ou dados sensíveis antes do compartilhamento.
- [ ] Bloqueadores, limitações e falhas estão registrados; nenhuma falha foi omitida para obter aprovação.

## Critério para avançar

O roteiro fornece evidência local, não decisão de release. Falha em início do app, migração, integridade/restore, perda de dados ou comportamento de segurança bloqueia a aprovação e exige parar, preservar dados e diagnosticar. Mesmo com todas as etapas locais PASS, release público continua dependendo de revisão independente, assinatura, avisos/licença/privacidade, suporte/atualização/rollback e autorização explícita de publicação.
