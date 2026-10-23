# Especificação de sincronização de carreira

## Objetivo

Definir como o aplicativo poderá relacionar uma carreira interna com informações externas ou lidas do jogo, sem assumir compatibilidade ou autorização ainda inexistentes. A sincronização não é requisito do MVP e não escreve no save.

## Modos e fontes

1. **Manual:** usuário cadastra ou importa CSV/JSON documentado para a carreira interna.
2. **Dados externos reais:** partidas/resultados de fornecedor aprovado, opcional e desligado por padrão.
3. **Leitura do jogo:** futuro adaptador read-only, condicionado a prova técnica, versão e autorização.

Cada modo identifica claramente a origem; valores importados nunca se confundem com eventos simulados.

## Pipeline conceitual

Selecionar origem → validar formato e versão → normalizar nomes/IDs/datas/competições → mapear entidades → detectar duplicatas e conflitos → mostrar prévia de diff → usuário confirma → aplicar transação ao banco do app → registrar recibo e resultado. Não aplicar parcialmente sem estado explícito.

## Reconciliação

Correspondência de clube/jogador/competição usa IDs estáveis quando disponíveis; fallback por nome exige confirmação em casos ambíguos. Partidas consideram data local e fuso, competição, mandante/visitante e rodada. Adiamentos, partidas canceladas, mudanças de adversário e resultados corrigidos viram conflito apresentado ao usuário, nunca sobrescrita silenciosa. Importação idempotente por source ID + versão; sem ID confiável, usar chave composta e revisão.

## Confirmação e reversão

Prévia exibe valor existente, valor proposto, origem, timestamp, confiança e efeito no calendário/tabela. Usuário pode aceitar, rejeitar ou resolver conflito. Toda importação confirmada gera lote auditável e snapshot lógico interno; desfazer só reverte alterações atribuíveis ao lote e informa dependências posteriores.

## Qualidade e falhas

Exibir fonte, atualização mais recente, cobertura, lacunas, atraso e estado do mapeamento. Erros distinguem formato inválido, fonte indisponível, licença não aprovada, dado incompleto, duplicata e conflito. Repetir importação não duplica eventos. Sem fonte válida, não fingir atualização ao vivo.

## Dados reais e termos

Antes de usar fonte externa, validar condições de acesso, licença, redistribuição, atribuição, limites de requisição e retenção. Sem parecer favorável, deixar conector desabilitado e preservar modo manual/offline. Cache e logs minimizam dados e guardam procedência.

## Leitura do jogo

Se autorizada no futuro, criar adaptador versionado por versão do jogo/formato, com permissões mínimas. Começar com inventário e leitura de cópia; nunca gravar no arquivo original. Mudança de versão desconhecida falha fechada e solicita revisão, sem tentar adivinhar offsets/formato.

## Critérios de aceite futuros

Importação mostra diff completo; duplicatas são idempotentes; conflitos não são resolvidos silenciosamente; usuário consegue rastrear cada dado à origem; falha de rede não perde o estado local; desligar conector não afeta domínio; nenhuma operação modifica save.