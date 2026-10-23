# Registro de decisões

## ADR-001 — Aplicação desktop independente do jogo

**Status:** aceita para planejamento.  
**Decisão:** construir ferramenta desktop complementar para Carreira de Treinador, começando com carreira e simulação próprias.  
**Motivo:** entregar utilidade sem depender de integração não comprovada com FC 27.  
**Consequência:** integração real é extensão posterior e pode ser descartada sem comprometer o núcleo.

## ADR-002 — Stack-base

**Status:** aceita.  
**Decisão:** Electron + React + TypeScript + Node.js + SQLite/Prisma. Tauri é alternativa sob avaliação, não mudança aprovada.  
**Motivo:** manter a decisão previamente estabelecida pelo projeto e reduzir retrabalho.  
**Consequência:** qualquer troca requer ADR nova, análise de trade-offs e autorização.

## ADR-003 — Pureza de Domain e Simulation

**Status:** aceita; inviolável.  
**Decisão:** domain/simulation não dependem de UI, Electron, Prisma, FC Live Editor ou rede. Clock, RNG e portas externas são injetados.  
**Motivo:** testabilidade, previsibilidade e reutilização independente.  
**Consequência:** adaptadores convertem dados externos para comandos/DTOs validados.

## ADR-004 — Proteção do save

**Status:** aceita; inviolável.  
**Decisão:** save real do jogo nunca é escrito ou sobrescrito. Futuro acesso, se houver, é leitura somente estrutural e começa em cópias de teste.  
**Motivo:** evitar corrupção e preservar a carreira do usuário.  
**Consequência:** sem exportação que modifique save e sem edição direta do arquivo.

## ADR-005 — Mudanças explicáveis

**Status:** aceita.  
**Decisão:** alterações relevantes passam por prévia, confirmação, histórico e reversão quando segura.  
**Motivo:** confiança, auditabilidade e controle do usuário.  
**Consequência:** não executar simulação ou importação silenciosamente ao abrir telas.

## ADR-006 — Referência GafferGame/TrueFoot

**Status:** referência de produto, não especificação técnica.  
**Decisão:** considerar categorias de recurso descritas pelo usuário (mundo vivo, resultados reais, gestão, estádio, editor ao vivo) e projetar solução independente. Não copiar marca, textos, código, ativos ou fórmulas.  
**Motivo:** usar inspiração sem dependência ou apropriação.  
**Consequência:** alegações externas não verificadas ficam identificadas como tal; integração ao FC 27 não é presumida.

## ADR-007 — Dados de partidas reais

**Status:** opcional e condicionada.  
**Decisão:** sincronização desligada por padrão até aprovação de fonte, licença/termos, cobertura e reconciliação.  
**Motivo:** qualidade e direitos de uso variam.  
**Consequência:** importação manual e simulação interna são alternativas.

## ADR-008 — Processo por fases

**Status:** aceita.  
**Decisão:** fases avançam uma a uma, com autorização explícita e gates verificáveis.  
**Motivo:** evitar implementar sem alinhamento e declarar qualidade sem evidência.  
**Consequência:** conclusão da documentação não autoriza Fase 1.

## ADR-009 — Narrativa assistida

**Status:** aceita para design, implementação posterior.  
**Decisão:** narrativa é opcional, derivada exclusivamente de eventos existentes e sem permissão para mutar o domínio.  
**Motivo:** impedir fatos inventados e separar linguagem de regra de negócio.  
**Consequência:** qualquer provedor de IA é um adaptador substituível, com fallback sem IA.