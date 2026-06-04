# Documentacao do Webapp de Estoque para Loja de Vinhos

## 1. Visao Geral

Este documento descreve a primeira versao de um webapp para gerenciar o estoque interno de uma loja especializada em vinhos e espumantes.

O objetivo principal do sistema e resolver tres problemas operacionais:

- Dificuldade de localizar rotulos no estoque.
- Falsa falta de produtos por desorganizacao fisica.
- Divergencia recorrente entre o estoque real e o estoque registrado.

O sistema deve permitir que a equipe consulte rapidamente quantas unidades existem de cada vinho, onde elas estao armazenadas e quais movimentacoes ocorreram ao longo do tempo.

## 2. Objetivos do Produto

### 2.1 Objetivo principal

Criar um webapp simples, confiavel e rapido para controlar a quantidade e a localizacao fisica dos vinhos e espumantes no estoque da loja.

### 2.2 Objetivos secundarios

- Reduzir o tempo gasto procurando rotulos.
- Evitar recompra desnecessaria de produtos que ja existem no estoque.
- Identificar vinhos esquecidos ou parados.
- Padronizar entradas, saidas, transferencias e conferencias.
- Criar historico de movimentacoes por produto e por usuario.
- Tornar o inventario mais rapido e frequente.

## 3. Escopo Inicial

### 3.1 Dentro do escopo

- Cadastro de vinhos e espumantes.
- Cadastro de fornecedores.
- Cadastro de locais fisicos de armazenamento.
- Consulta por nome ou codigo de barras.
- Registro de entrada de estoque.
- Registro de saida de estoque.
- Transferencia entre locais.
- Ajuste manual de quantidade.
- Inventario rapido.
- Historico de movimentacoes.
- Relatorio de divergencias.
- Relatorio de produtos parados.
- Controle basico de usuarios e permissoes.

### 3.2 Fora do escopo da primeira versao

- Integracao automatica com sistema de vendas.
- App nativo para Android ou iOS.
- Controle financeiro completo.
- Controle avancado de compras.
- Previsao automatica de demanda.
- Inteligencia artificial para sugestao de reposicao.
- Controle detalhado de destilados e acessorios.

Destilados e outros itens secundarios podem ser cadastrados futuramente, mas a primeira versao deve ser otimizada para vinhos e espumantes.

## 4. Publico Usuario

### 4.1 Administrador

Responsavel por configurar o sistema, cadastrar usuarios, revisar divergencias, acompanhar relatorios e corrigir problemas de estoque.

Permissoes:

- Cadastrar, editar e inativar produtos.
- Cadastrar locais e fornecedores.
- Registrar qualquer movimentacao.
- Realizar inventarios.
- Visualizar relatorios.
- Gerenciar usuarios.

### 4.2 Operador de Estoque

Responsavel por entrada, saida, organizacao e conferencia fisica dos produtos.

Permissoes:

- Consultar produtos.
- Registrar entrada e saida.
- Transferir produtos entre locais.
- Realizar inventario.
- Visualizar historico operacional.

### 4.3 Consulta

Usuario com acesso apenas para localizar produtos e verificar quantidades.

Permissoes:

- Buscar produto por nome ou codigo de barras.
- Visualizar quantidade total.
- Visualizar localizacao fisica.

## 5. Conceitos Principais

### 5.1 Produto

Representa um vinho ou espumante cadastrado no sistema.

Campos principais:

- SKU interno.
- Nome.
- Tipo: vinho ou espumante.
- Cor: tinto, branco ou rose.
- Uva.
- Pais.
- Fornecedor.
- Safra.
- Codigo de barras.
- Status: ativo ou inativo.
- Observacoes.

### 5.2 Local de armazenamento

Representa uma posicao fisica dentro do estoque.

Exemplos:

- Prateleira A, Nivel 1.
- Prateleira A, Nivel 2.
- Adega Madeira 1, Nicho 4.
- Adega Madeira 2, Nicho 8.
- Expositor.

Cada local deve ter uma identificacao simples e visivel, preferencialmente com etiqueta fisica no estoque.

### 5.3 Estoque por local

O mesmo vinho pode estar distribuido em mais de um local.

Exemplo:

```text
Produto: Catena Malbec 2021
Quantidade total: 12 unidades

Localizacoes:
- Prateleira A / Nivel 2: 8 unidades
- Adega Madeira 1 / Nicho 4: 4 unidades
```

### 5.4 Movimentacao

Toda alteracao de quantidade ou localizacao deve gerar uma movimentacao registrada no historico.

Tipos de movimentacao:

- Entrada.
- Saida.
- Transferencia.
- Ajuste.
- Inventario.
- Perda ou avaria.

Cada movimentacao deve registrar:

- Produto.
- Tipo de movimentacao.
- Quantidade.
- Local de origem, quando aplicavel.
- Local de destino, quando aplicavel.
- Usuario responsavel.
- Data e hora.
- Status da movimentacao.
- Observacao opcional.

Movimentacoes nao devem ser apagadas. Quando uma movimentacao for feita incorretamente, o sistema deve registrar um estorno vinculado a movimentacao original.

## 6. Modulos do Sistema

## 6.1 Dashboard

Tela inicial do sistema.

Deve exibir:

- Total de produtos cadastrados.
- Total de unidades em estoque.
- Produtos com estoque zerado.
- Produtos com divergencia recente.
- Produtos sem movimentacao ha muitos dias.
- Ultimas movimentacoes.

O dashboard deve ser objetivo e operacional, sem excesso de graficos decorativos.

## 6.2 Cadastro de Produtos

Funcionalidades:

- Criar novo produto.
- Editar produto existente.
- Inativar produto.
- Buscar por nome, safra, pais, fornecedor ou codigo de barras.
- Buscar por cor ou uva.
- Visualizar quantidade total e localizacoes.

Campos:

- SKU interno.
- Nome do produto.
- Tipo.
- Cor: tinto, branco ou rose.
- Uva.
- Pais.
- Fornecedor.
- Safra.
- Codigo de barras.
- Observacoes.
- Status.

Regras:

- O SKU interno deve ser unico e obrigatorio.
- Tipo, cor e uva devem ser obrigatorios no cadastro do produto.
- O codigo de barras deve ser unico quando identificar um unico produto e uma unica safra.
- Se o mesmo codigo de barras for usado para safras diferentes, o sistema deve permitir o cadastro, mas exigir escolha manual da safra na leitura.
- Produtos inativos nao devem aparecer como sugestao principal em novas movimentacoes.
- A quantidade total nao deve ser editada diretamente no cadastro; deve ser calculada pelas movimentacoes e saldos por local.

## 6.3 Cadastro de Fornecedores

Funcionalidades:

- Criar fornecedor.
- Editar fornecedor.
- Inativar fornecedor.
- Listar produtos vinculados ao fornecedor.

Campos:

- Nome.
- CNPJ ou identificacao, opcional.
- Telefone, opcional.
- Email, opcional.
- Observacoes.
- Status.

## 6.4 Cadastro de Locais

Funcionalidades:

- Criar local de armazenamento.
- Editar local.
- Inativar local.
- Ver produtos armazenados em cada local.

Campos:

- Nome do local.
- Tipo: prateleira, adega de madeira, expositor ou outro.
- Codigo interno.
- Descricao.
- Status.

Exemplos de padronizacao:

```text
P-A-N1 = Prateleira A, Nivel 1
P-A-N2 = Prateleira A, Nivel 2
AM-01-N04 = Adega Madeira 1, Nicho 4
EXP-01 = Expositor
```

## 6.5 Busca e Leitura de Codigo de Barras

Esta deve ser uma das telas mais importantes do sistema.

Funcionalidades:

- Buscar produto digitando nome.
- Buscar produto digitando ou lendo codigo de barras.
- Buscar produto por SKU interno.
- Exibir resultado rapidamente.
- Mostrar quantidade total.
- Mostrar localizacoes com quantidade por local.
- Permitir acesso direto a entrada, saida, transferencia e inventario.

Fluxo desejado:

```text
Ler codigo de barras
-> Sistema identifica produto
-> Se houver mais de uma safra com o mesmo codigo, usuario seleciona a safra correta
-> Exibe quantidade total
-> Exibe locais onde o produto esta armazenado
-> Usuario escolhe a acao necessaria
```

## 6.6 Entrada de Estoque

Usada quando novos produtos chegam na loja.

Campos:

- Produto.
- Quantidade.
- Local de destino.
- Fornecedor.
- Observacao opcional.

Regras:

- A entrada deve aumentar o saldo do produto no local informado.
- A entrada deve gerar historico de movimentacao.
- O sistema deve permitir entrada de produto ja cadastrado.
- Se o produto nao estiver cadastrado, o usuario autorizado deve poder cadastra-lo antes da entrada.
- A entrada deve ser registrada no momento em que a mercadoria for armazenada fisicamente.

## 6.7 Saida de Estoque

Usada quando unidades saem do estoque.

Campos:

- Produto.
- Quantidade.
- Local de origem.
- Motivo da saida: venda, retirada, perda, avaria ou outro.
- Observacao opcional.

Regras:

- A saida deve reduzir o saldo do produto no local informado.
- O sistema nao deve permitir saldo negativo sem permissao administrativa.
- A saida deve gerar historico de movimentacao.
- Toda retirada fisica do estoque deve ser registrada no sistema no momento da retirada.
- Quando a saida for registrada depois do ocorrido, o usuario deve informar uma observacao.

## 6.8 Transferencia entre Locais

Usada quando um vinho muda de posicao fisica dentro do estoque.

Campos:

- Produto.
- Quantidade.
- Local de origem.
- Local de destino.
- Observacao opcional.

Regras:

- A transferencia deve reduzir o saldo no local de origem.
- A transferencia deve aumentar o saldo no local de destino.
- A transferencia deve gerar historico.
- Origem e destino nao podem ser iguais.
- Toda mudanca fisica de local deve ser registrada no sistema no momento da movimentacao.

## 6.9 Inventario Rapido

Modulo para conferencia fisica do estoque.

Fluxo:

```text
Selecionar local ou escanear produto
-> Informar quantidade encontrada
-> Sistema compara com quantidade registrada
-> Usuario confirma ajuste, se necessario
```

Resultados possiveis:

- Sem divergencia.
- Sobra fisica.
- Falta fisica.
- Produto encontrado em local diferente.

Regras:

- Toda divergencia deve ser registrada.
- Ajustes de inventario devem gerar movimentacao.
- O usuario deve informar observacao quando houver diferenca relevante.

## 6.10 Relatorios

### 6.10.1 Relatorio de estoque atual

Deve listar:

- Produto.
- Cor.
- Uva.
- Safra.
- Pais.
- Fornecedor.
- Quantidade total.
- Localizacoes.

### 6.10.2 Relatorio de divergencias

Deve listar:

- Produto.
- Local.
- Quantidade esperada.
- Quantidade encontrada.
- Diferenca.
- Data.
- Usuario.

### 6.10.3 Relatorio de produtos parados

Deve listar produtos sem movimentacao por periodo configuravel.

Filtros sugeridos:

- Sem movimentacao ha 30 dias.
- Sem movimentacao ha 60 dias.
- Sem movimentacao ha 90 dias.
- Sem movimentacao ha 120 dias ou mais.

### 6.10.4 Historico de movimentacoes

Deve permitir filtros por:

- Produto.
- Usuario.
- Tipo de movimentacao.
- Local.
- Periodo.

## 7. Fluxos Operacionais

## 7.1 Chegada de mercadoria

```text
Produto chega na loja
-> Usuario confere nota ou pedido
-> Busca produto no sistema
-> Se nao existir, cadastra produto
-> Registra entrada
-> Define local fisico
-> Sistema atualiza saldo
```

## 7.2 Procura de produto

```text
Cliente ou funcionario precisa de um vinho
-> Usuario busca por nome ou codigo de barras
-> Sistema mostra quantidade total
-> Sistema mostra localizacao
-> Usuario retira produto do local correto
```

## 7.3 Saida manual

```text
Produto sai do estoque
-> Usuario localiza produto no sistema
-> Seleciona saida
-> Informa quantidade e local
-> Sistema reduz saldo
-> Sistema registra historico
```

## 7.4 Reorganizacao fisica

```text
Usuario move vinhos de uma prateleira para outra
-> Abre transferencia
-> Informa produto, quantidade, origem e destino
-> Sistema atualiza os dois locais
-> Historico registra a mudanca
```

## 7.5 Conferencia periodica

```text
Usuario escolhe um local
-> Confere fisicamente os produtos
-> Informa as quantidades encontradas
-> Sistema aponta divergencias
-> Usuario confirma ajustes autorizados
```

## 8. Regras de Negocio

- Um produto pode existir em multiplos locais.
- O saldo total de um produto e a soma dos saldos em todos os locais ativos.
- Quantidades nao devem ser alteradas diretamente no cadastro do produto.
- Toda alteracao de saldo deve gerar movimentacao.
- Toda movimentacao deve registrar usuario, data e hora.
- Toda entrada, saida ou transferencia fisica deve ser registrada no momento em que ocorrer.
- O sistema deve evitar saldo negativo.
- Locais inativos nao devem ser usados em novas movimentacoes.
- Produtos inativos nao devem ser usados em novas entradas, salvo permissao administrativa.
- SKU interno deve ser unico e obrigatorio.
- Codigo de barras pode se repetir apenas quando representar safras diferentes do mesmo produto, exigindo selecao manual da safra correta.
- Inventarios devem registrar diferencas mesmo quando o ajuste nao for aplicado imediatamente.
- Movimentacoes incorretas devem ser estornadas por uma nova movimentacao vinculada a original, nunca apagadas.

## 9. Modelo de Dados Inicial

### 9.1 Tabela: users

```text
id
name
email
password_hash
role
status
created_at
updated_at
```

### 9.2 Tabela: suppliers

```text
id
name
document
phone
email
notes
status
created_at
updated_at
```

### 9.3 Tabela: products

```text
id
sku
name
type
wine_color
grape
country
supplier_id
vintage
barcode
notes
status
created_at
updated_at
```

### 9.4 Tabela: storage_locations

```text
id
name
code
type
description
status
created_at
updated_at
```

### 9.5 Tabela: inventory_balances

```text
id
product_id
storage_location_id
quantity
created_at
updated_at
```

Restricoes:

```text
unique(product_id, storage_location_id)
quantity >= 0
```

### 9.6 Tabela: stock_movements

```text
id
product_id
movement_type
quantity
source_location_id
destination_location_id
supplier_id
reason
notes
user_id
status
reversed_movement_id
created_at
```

Status sugeridos:

```text
active
reversed
reversal
```

### 9.7 Tabela: inventory_audits

```text
id
product_id
storage_location_id
expected_quantity
counted_quantity
difference
status
notes
user_id
created_at
```

## 10. Telas da Primeira Versao

### 10.1 Login

- Email.
- Senha.
- Recuperacao de senha.

### 10.2 Dashboard

- Resumo do estoque.
- Indicadores principais.
- Lista das ultimas movimentacoes.
- Alertas de produtos parados.

### 10.3 Produtos

- Lista de produtos.
- Filtros.
- Cadastro e edicao.
- Caracteristicas como tipo, cor, uva, pais e safra.
- Visualizacao de localizacoes.

### 10.4 Locais

- Lista de locais.
- Cadastro e edicao.
- Visualizacao de produtos por local.

### 10.5 Fornecedores

- Lista de fornecedores.
- Cadastro e edicao.

### 10.6 Busca Rapida

- Campo de busca por nome.
- Campo de leitura de codigo de barras.
- Resultado com quantidade total e localizacoes.
- Acoes rapidas.

### 10.7 Movimentacoes

- Entrada.
- Saida.
- Transferencia.
- Ajuste.
- Historico.

### 10.8 Inventario

- Conferencia por produto.
- Conferencia por local.
- Registro de divergencias.

### 10.9 Relatorios

- Estoque atual.
- Divergencias.
- Produtos parados.
- Historico de movimentacoes.

### 10.10 Usuarios

- Cadastro de usuarios.
- Edicao de permissoes.
- Ativacao e inativacao.

## 11. Requisitos de Interface

- O sistema deve ser web e responsivo.
- Deve funcionar bem em computador, tablet e celular.
- A busca deve ser sempre visivel ou facilmente acessivel.
- As telas operacionais devem ter poucos passos.
- Botoes de entrada, saida, transferencia e inventario devem ser claros.
- O usuario deve conseguir localizar um produto em poucos segundos.
- O layout deve priorizar leitura, velocidade e confiabilidade.
- O sistema deve evitar telas decorativas ou excesso de informacao visual.

## 12. Requisitos Tecnicos Recomendados

### 12.1 Frontend

Opcoes recomendadas:

- React com Next.js.
- Vue com Nuxt.

Requisitos:

- Interface responsiva.
- Componentes reutilizaveis.
- Formularios com validacao.
- Tabelas com filtros e busca.
- Leitura de codigo de barras via campo de input ou leitor USB.

### 12.2 Backend

Opcoes recomendadas:

- Node.js com NestJS ou Express.
- Python com FastAPI ou Django.
- Laravel.

Requisitos:

- API REST ou GraphQL.
- Autenticacao.
- Controle de permissoes.
- Validacao de regras de negocio.
- Logs de movimentacao.

### 12.3 Banco de dados

Recomendado:

- PostgreSQL.

Motivos:

- Confiavel para dados operacionais.
- Excelente suporte a relacionamentos.
- Bom desempenho para consultas e relatorios.
- Escalavel para futuras integracoes.

## 13. Seguranca e Confiabilidade

- Senhas devem ser armazenadas com hash seguro.
- Usuarios devem ter permissoes por perfil.
- Alteracoes de estoque devem ser auditaveis.
- Movimentacoes nao devem ser apagadas fisicamente; se necessario, devem ser estornadas.
- O sistema deve ter backup automatico.
- Erros relevantes devem ser registrados.
- Operacoes criticas devem pedir confirmacao.

## 14. Indicadores de Sucesso

O sucesso do sistema deve ser medido por:

- Reducao do tempo para encontrar um vinho.
- Reducao de divergencias entre estoque real e sistema.
- Reducao de recompra desnecessaria.
- Aumento da frequencia de inventarios.
- Melhor visibilidade de produtos parados.
- Maior confianca da equipe nas quantidades registradas.

## 15. Roadmap Sugerido

### Fase 1: MVP operacional e confiabilidade

- Cadastro de produtos.
- Cadastro de locais.
- Cadastro de fornecedores.
- Busca por nome e codigo de barras.
- Entrada, saida e transferencia.
- Estoque por local.
- Historico de movimentacoes.
- Controle basico de usuarios e permissoes.
- Inventario rapido.
- Relatorio de divergencias.
- Produtos parados.
- Ajustes com justificativa.
- Estornos de movimentacoes.

### Fase 2: Otimizacao

- Sugestao de reposicao.
- Relatorios de giro.
- Classificacao de produtos por movimentacao.
- Melhor organizacao fisica baseada em frequencia de acesso.

### Fase 3: Integracoes

- Integracao com sistema de vendas.
- Importacao de planilhas.
- Exportacao avancada de relatorios.
- App mobile ou PWA offline.

## 16. Decisoes de Produto para Validar

Antes do desenvolvimento, e importante confirmar:

- Quantos usuarios vao usar o sistema.
- Se havera leitor de codigo de barras USB, camera do celular ou ambos.
- Se o estoque sera conferido por produto, por local ou pelos dois.
- Como os locais fisicos serao etiquetados.
- Se vendas serao registradas manualmente no MVP ou importadas futuramente.
- Qual sistema de venda a loja usa atualmente, se houver.
- Se os codigos de barras dos vinhos atuais se repetem entre safras diferentes.

## 17. Proxima Etapa Recomendada

A proxima etapa e criar a especificacao tecnica da primeira versao, contendo:

- Arquitetura do sistema.
- Estrutura das rotas.
- Esquema detalhado do banco de dados.
- Contratos da API.
- Prototipo das telas principais.
- Plano de desenvolvimento por sprints.
