# Procedimento de SBOM e inventário de licenças — Windows

**Estado:** procedimento proposto para gerar evidência do candidato; não executado nem aprovado como inventário final. Não instala ferramentas, não atualiza dependências e não altera o produto. Elaborado em 2026-10-17.

## Qual artefato estamos avaliando

O build de teste atualmente validado pelo usuário é `Gerenciador EA FC 27 Setup 0.1.1.exe`, Electron 44.8.0, NSIS x64, SHA-256 `781683D2516EE1F8FB98F37B3B4C92FF08F18C665A9447B5CA23805B3F99B4C2`. Ele está sem assinatura Authenticode e não é release público. O SBOM deverá ser regenerado para qualquer candidato final; não reutilizar este inventário se código, lockfile ou instalador mudar.

## A. Preservar a evidência atual

No PowerShell, abra a raiz `C:\Users\User\Documents\GHH_PROJECTS\Gaffer Tools EAFC27` e confirme o hash do arquivo atual:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath "apps\desktop\release\Gerenciador EA FC 27 Setup 0.1.1.exe"
```

O hash deve coincidir exatamente com o informado acima. Se não coincidir, pare e anote a nova identidade antes de gerar qualquer evidência. Não rode `pnpm install`, `pnpm update`, `pnpm audit --fix` ou qualquer comando de upgrade durante a coleta.

## B. Inventário de licença com ferramenta temporária

O usuário autorizou execução temporária via `pnpm dlx`. A versão consultada foi `license-checker@25.0.1`; não foi instalada no projeto. Use os comandos seguintes para inventários com os dados disponíveis no workspace:

```powershell
pnpm dlx license-checker --json --production --out "apps\desktop\release\license-inventory-production.json"
pnpm dlx license-checker --json --out "apps\desktop\release\license-inventory-all.json"
```

Confirme que os arquivos foram gerados e guarde a saída de erro. O modo `--production` depende das classificações do package manager/workspace e deve ser conferido contra o payload do instalador. O JSON contém metadados declarados pelos pacotes e não substitui revisar textos LICENSE/NOTICE, licenças duplas, exceções, fontes, assets, Electron/Chromium e obrigações de distribuição.

Se a ferramenta existir mas rejeitar opções, não tente comandos de memória: registre a versão e a mensagem; vamos conferir a sintaxe dessa versão antes de repetir.

## C. SBOM do lockfile (CycloneDX)

O usuário autorizou `pnpm dlx`; a ferramenta apresentou ajuda, baixou temporariamente suas dependências para o cache e não foi adicionada ao projeto. A CLI aceita manifest, `--workspace`, `--include-workspace-root`, `--gather-license-texts`, `--output-file`, `--output-format JSON` e `--validate`; workspace selection é declarada experimental.

Gere o SBOM geral do monorepo e do root, com evidência de licença e validação:

```powershell
pnpm dlx @cyclonedx/cyclonedx-npm --package-lock-only --gather-license-texts --validate --output-format JSON --output-file "apps\desktop\release\sbom-monorepo.cdx.json"
```

A ajuda da CLI não menciona `pnpm-lock.yaml` como fonte. Por isso, **não** rode `--package-lock-only` esperando que ele leia `pnpm-lock.yaml`, nem use `--workspace` como se estivesse garantido para pnpm: o suporte de workspaces é marcado experimental e não confirma pnpm. Não crie package-lock nem altere lockfiles. O SBOM CycloneDX formal fica bloqueado até selecionarmos uma ferramenta que documente suporte à versão pnpm 9, ou definirmos um procedimento de conversão auditável.

Um relatório produzido a partir de `node_modules` poderia ser apenas inventário da árvore instalada e pode omitir ou duplicar dependências com symlinks pnpm; não o rotule como SBOM completo. Primeiro gere o inventário license-checker e compartilhe sua saída/arquivos; depois decidimos como obter um SBOM que represente o lockfile correto.

## D. Conferência contra o payload final

O SBOM do lockfile descreve a resolução declarada, não necessariamente o que o instalador inclui. Faça a reconciliação do inventário com os arquivos do pacote candidato: `app.asar`, `resources/prisma-client`, `resources/prisma-runtime`, módulos nativos, binários e componentes redistribuíveis do Electron/NSIS. Registre pacotes incluídos, gerados e excluídos; verifique também se as licenças/avisos correspondentes acompanham a distribuição. Não extrair ou executar binários desconhecidos; utilize ferramentas confiáveis e já aprovadas no ambiente.

O pacote atual contém licença do produto e código runtime gerado do Prisma, mas ainda não houve revisão independente das licenças de terceiros. Não inferir permissão de redistribuição apenas porque electron-builder gerou o instalador.

## E. Registrar resultados

Para cada arquivo produzido, registre: nome, data/hora local, versão da ferramenta, comando exato, hash SHA-256, hash do instalador associado, hash do `pnpm-lock.yaml`, escopo (monorepo/produção/payload), avisos/erros, responsável pela revisão e pendências. Guarde SBOM e inventários em diretório de release versionado/arquivado, não apenas em `release/` se essa pasta for limpa durante o próximo build.

## Limites do gate

Gerar SBOM/inventário é uma etapa técnica, não aprovação de licença nem parecer jurídico. Uma pessoa responsável deve revisar obrigações de atribuição, distribuição de fontes/notices, licenças incompatíveis ou restritivas, assets e componentes binários. Até essa revisão, assinatura do artefato e demais gates, o release público permanece bloqueado.
