# Segurança e privacidade

## Escopo de confiança

A aplicação local processa dados do usuário, arquivos importados e, condicionalmente, dados de ferramentas externas. Considere todo conteúdo de arquivo, rede e renderer não confiável. Não confundir logs/narrativas/importações com instruções executáveis.

## Fronteiras

Electron Main é privilegiado; renderer é não confiável. Usar `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, CSP restritiva e preload mínimo. IPC usa canais allowlisted, esquemas rígidos, limite de tamanho, origem verificada e validação no lado privilegiado. Proibir acesso arbitrário a filesystem, shell e processo via renderer.

## Dados do jogo e save

Política inviolável: o save original do FC 27 é somente leitura estrutural, nunca destino de escrita. Não oferecer salvar de volta, patch, reserialização ou substituição. Uma futura leitura exige aprovação e teste com cópias descartáveis. Não ler memória/injetar código nem contornar anti-cheat ou mecanismos de integridade. Não operar em modos online.

## Arquivos e importação

Selecionar arquivos por diálogo restrito; tamanho máximo e formatos permitidos definidos por caso de uso; validar estrutura, encoding, limites, campos e referências. Tratar dados como texto/dados, nunca executar macros/scripts. Evitar traversal, symlink e caminho fornecido livremente pelo renderer. Operações de exportação gravam somente arquivo novo do formato do aplicativo e nunca o save do jogo.

## Persistência e segredos

Banco local com migrações, backup e recuperação. Segredos de autenticação, se necessários no futuro, ficam no armazenamento seguro do SO, não no banco/log. Minimizar dados pessoais importados; informar finalidade, retenção e exportação/remoção. A telemetria, se vier a existir, é opt-in e minimizada.

## Dependências e distribuição

Lockfile revisado, inventário e auditoria de dependências; atualização de Electron/Node; assinatura de artefatos e verificação de integridade quando suportadas; releases reprodutíveis. Não baixar nem executar binários de terceiros sem validação. Live Editor é dependência externa não aprovada neste escopo.

## Ameaças principais e mitigação

Corrupção de carreira: nenhuma escrita no save, cópias de teste, backups. IPC abusivo: allowlist e validação. Importação maliciosa: parser limitado e sem execução. Injeção de instrução via texto: saída apresentada como dado e sem autoridade. Dependência comprometida: revisão, lockfile, assinatura. Vazamento de dados: minimização e logs sem payload sensível.

## Resposta a incidentes

Desabilitar feature flag/adaptador; preservar logs minimizados; identificar versão afetada; orientar uso de backup próprio do aplicativo; não tentar reparar o save do jogo. Documentar incidente, impacto, mitigação e critério de reativação. Política detalhada será definida antes da distribuição.