# Triagem preliminar de licenças e payload

**Status:** análise manual preliminar, não é SBOM CycloneDX, auditoria legal nem aprovação de redistribuição. Data da triagem: 2026-10-17.

## Identidade do artefato

Artefato local examinado: `apps/desktop/release/win-unpacked/resources/app.asar`, extraído do build Windows Electron 44.8.0 / electron-builder 26.15.3 NSIS x64. Instalador associado informado pelo usuário: `Gerenciador EA FC 27 Setup 0.1.1.exe`, SHA-256 `781683D2516EE1F8FB98F37B3B4C92FF08F18C665A9447B5CA23805B3F99B4C2`, Authenticode `NotSigned`. Esta análise se limita ao índice de arquivos do app.asar e metadados/arquivos LICENSE no `node_modules` já instalado. Não incluiu análise completa dos binários Electron/Chromium, instalador NSIS, DLLs, runtime/engine Prisma, fontes, imagens ou avisos incorporados.

## Payload confirmado pelo índice ASAR

O app.asar contém 88 entradas em `/node_modules/@prisma/client` (incluindo arquivos de runtime gerados/fornecidos pelo pacote e scripts). Não contém caminhos `@prisma/config`, `deepmerge-ts`, pacote executável `prisma`, `sprintf-js`, Vite ou Vitest. Isso concorda com a configuração do builder, que empacota saída compilada e `@prisma/client` gerado, enquanto electron-builder usa dependências de desenvolvimento para construir o artefato. Recursos Prisma separados do ASAR incluem client gerado, runtime e query engine nativa; eles também precisam ser incluídos na revisão completa das licenças.

A ausência de um caminho no índice do app.asar não basta para concluir ausência de strings ou código copiado/bundled dentro de outros arquivos. A constatação é sobre entradas/pacotes nomeados, não análise semântica de cada bundle/binário.

## Componentes diretos observados

| Componente | Versão | Licença declarada no package.json | Evidência local | Situação |
|---|---:|---|---|---|
| `@prisma/client` | 6.19.3 | Apache-2.0 | Package metadata e arquivo `LICENSE`; presente no payload ASAR e redistribuído runtime | Revisar licença/notice de arquivos gerados e runtime separado |
| Electron | 44.8.0 | MIT | Package metadata e `LICENSE`; runtime empacotado | Revisar avisos/distribuição Electron e Chromium no pacote completo |
| React | 18.3.1 | MIT | Package metadata e `LICENSE`; bundle renderer do app | Confirmar alcance através do bundle e reter notice |
| React DOM | 18.3.1 | MIT | Package metadata e `LICENSE`; bundle renderer | Confirmar alcance e reter notice |
| Prisma CLI | 6.19.3 | Apache-2.0 | Dev dependency; metadata e LICENSE no workspace | Não localizado como pacote no app.asar; engine gerada/runtime requer revisão separada |
| electron-builder | 26.15.3 | MIT | Dev dependency de build | Não aparece como dependência nomeada no app.asar; ferramenta usada para construir |
| electron-builder-squirrel-windows | 26.15.3 | MIT | Dev dependency de build | Toolchain; artefato produzido é NSIS, não Squirrel; ainda conferir recursos redistribuídos |
| electron-vite | 6.0.0 | MIT | Dev dependency de build | Não aparece como pacote nomeado no payload |
| Vite | 8.3.4 | MIT | Dev dependency de build | Não aparece como pacote nomeado no payload |
| Vitest | 5.0.5 | MIT | Dev dependency de teste | Não aparece no payload |

Os valores acima são declarados pelos manifests; esta tabela não substitui leitura integral dos textos de licença. A árvore pnpm instalada ainda tinha versões antigas de Electron/electron-builder por causa da história do workspace; foram excluídas da tabela de versão candidata após comparar o lockfile atual e o hash do pacote, mas a coleta completa deve filtrar exatamente as versões selecionadas.

## Findings transitivos que precisam de avaliação separada

`deepmerge-ts@7.1.5` declara BSD-3-Clause e tem `LICENSE` local. Ele aparece na árvore lockfile via `@prisma/config`, mas não como pacote nomeado no `app.asar`; o caminho de audit de Prisma config não está listado no payload ASAR. O aviso de segurança permanece no audit --prod; não concluir risco zero sem avaliação técnica do alcance da árvore gerada/runtime e decisão de segurança.

`sprintf-js@1.1.3` declara BSD-3-Clause e tem `LICENSE` local; aparece via `electron-builder -> @electron/get -> global-agent -> roarr`, sem caminho no app.asar. É toolchain de build, mas o audit geral ainda reporta o advisory moderate; manter no inventário do workspace e na avaliação de processo de build.

A execução `license-checker` geral identificou 35 registros agregados: 26 MIT, 7 Apache-2.0, 1 BSD-2-Clause e 1 UNLICENSED. A execução com `--start apps/desktop --production` encontrou apenas `@gerenciador/desktop@0.1.1` (UNLICENSED) e `@prisma/client@6.19.3` (Apache-2.0), evidência de que o traverser não representa adequadamente workspaces pnpm. Os números agregados não descrevem o payload final e não devem ser apresentados como lista final de componentes.

## Pendências para fechar o gate

- Gerar SBOM por ferramenta que declare suporte a `pnpm-lock.yaml` v9/workspaces ou estabelecer método verificável de converter lockfile sem alterar o projeto.
- Obter inventário de produção de todos os pacotes efetivamente incluídos e mapear cada um à licença e texto LICENSE/NOTICE.
- Revisar todos os pacotes direct/transitive do payload e os binários redistribuídos: Electron/Chromium, NSIS/elevate, Prisma client/runtime/query engine, módulos nativos, fonts e assets.
- Verificar atribuições exigidas, licenças duplas, exceções e termos de redistribuição; obter revisão do responsável jurídico/de produto.
- Repetir a coleta para hash e versão inequívocos do candidato final; o instalador atual é unsigned 0.1.1 de teste.

**Conclusão:** triagem útil para escopo e próxima coleta; SBOM e aprovação de licenças seguem pendentes. Não autoriza publicação.
