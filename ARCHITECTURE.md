# Arquitetura de alto nível

## Decisão-base

Aplicação desktop com Electron, React, TypeScript, Node.js e SQLite/Prisma. A arquitetura é um monorepo TypeScript planejado, mas esta Fase 0 não cria código nem altera dependências. Tauri continua alternativa sob avaliação; não substituir a stack sem ADR aprovada.

## Camadas e dependências

```text
Renderer React
    │ IPC tipado, allowlist e validação
Electron Main / casos de uso
    ├── Domain (regras e invariantes puras)
    ├── Simulation (transições determinísticas e eventos)
    ├── Ports (repositórios, relógio, RNG, importadores)
    └── Adapters (SQLite/Prisma; importação; futuro leitor read-only)
```

A direção de dependência aponta para contratos do domínio. DOMAIN e SIMULATION não importam Electron, React, Prisma, filesystem, rede, Live Editor ou SDK da EA. Dependências externas são injetadas como portas em camadas de aplicação/adaptadores.

## Componentes conceituais

**Desktop shell:** ciclo de vida, janela, menus, atualizações e integração nativa mínima. **Renderer:** apresentação e interação; sem Node integration. **Application:** casos de uso, validação, autorização do usuário e orquestração de transações. **Domain:** entidades, value objects, políticas e invariantes. **Simulation:** regras temporais puras, cálculo e geração de eventos com semente controlada. **Persistence adapter:** repositórios e migrações SQLite/Prisma para dados próprios da aplicação. **External adapters:** importadores versionados e isolados; integração com dados do jogo não existe até prova de viabilidade.

## Fluxo de comando

UI envia comando de intenção com identificador e payload limitado; IPC valida origem/canal/esquema; caso de uso carrega estado por repositório; domínio valida regras; simulação calcula eventos e proposta; usuário revisa prévia; uma confirmação explícita grava apenas no banco próprio do aplicativo. Cada gravação forma transação e evento de auditoria.

## Determinismo

Clock e gerador pseudoaleatório são dependências explícitas. Mesmo estado, conjunto de regras, versão do motor e seed geram o mesmo resultado. Nunca usar Math.random ou horário global escondido dentro de função de domínio/simulação. Guardar versão de regra e parâmetros usados para explicar históricos.

## Dados e persistência

SQLite local mantém dados da aplicação, nunca copia nem altera o save original. Entidades têm IDs estáveis e origem: USER, IMPORTED, OBSERVED ou SIMULATED. Migrações devem ser versionadas, testadas em cópia e possuir estratégia de backup/recuperação. Segredos não ficam no banco em texto claro.

## Segurança de Electron

Context isolation, sandbox, `nodeIntegration: false`, CSP restritiva, IPC por allowlist e validação de todos os parâmetros no processo privilegiado. Renderer não pode fornecer caminho arbitrário de arquivo. Diálogos nativos ou portas de arquivo expõem apenas operações permitidas. Logs minimizados, atualização com assinatura e dependências auditadas.

## Integrações condicionais

Sincronização real e leitura do jogo ficam atrás de portas independentes, feature flags e versões explícitas. Toda entrada externa é dado não confiável. Qualquer adaptador que implique interação com processo/jogo precisa de estudo separado, testes em ambiente isolado e autorização específica. A política de proteção do save prevalece.

## Qualidade arquitetural

Testes de domínio sem Electron/SQLite; testes de adaptadores com banco temporário; testes IPC com matriz de canal/payload/origem; regra automatizada impede imports externos em Domain/Simulation. Não há gates executados nesta fase de especificação.