# Especificacao Tecnica do MVP - Webapp de Estoque para Loja de Vinhos

## 1. Objetivo

Este documento transforma a documentacao funcional do webapp em uma especificacao tecnica para desenvolvimento da primeira versao do sistema.

O MVP deve permitir que a loja controle produtos, locais de armazenamento, saldos por local e movimentacoes de estoque com historico auditavel.

O foco tecnico da primeira versao e entregar confiabilidade operacional:

- Saber quantas unidades existem de cada vinho.
- Saber onde cada unidade esta armazenada.
- Registrar entrada, saida, transferencia, ajuste e inventario.
- Evitar divergencia entre estoque fisico e sistema.
- Permitir busca rapida por nome, SKU interno ou codigo de barras.

## 2. Stack Recomendada

### 2.1 Aplicacao web

Recomendacao:

- Next.js.
- React.
- TypeScript.
- Tailwind CSS.
- Prisma ORM.
- PostgreSQL.

Motivos:

- Permite construir frontend e backend no mesmo projeto.
- Reduz complexidade inicial do MVP.
- Tem boa produtividade para formularios, tabelas, filtros e rotas de API.
- TypeScript ajuda a reduzir erros em regras de negocio.
- Prisma acelera modelagem e migracoes do banco.
- PostgreSQL e robusto para dados relacionais e historico de estoque.

### 2.2 Alternativa futura

Se o sistema crescer muito, o backend pode ser separado em uma API dedicada, usando NestJS, FastAPI ou Laravel. Para o MVP, manter tudo em Next.js e suficiente e mais eficiente.

### 2.3 Autenticacao recomendada

Para o MVP, a autenticacao recomendada e baseada em sessoes seguras com cookie HTTP-only.

Opcao recomendada:

- Auth.js/NextAuth integrado ao Next.js.
- Credenciais por email e senha.
- Sessao armazenada em cookie HTTP-only.
- Senha armazenada com hash seguro.

Regras:

- Nao usar senha em texto puro.
- Nao armazenar token sensivel em `localStorage`.
- Validar permissao no backend, nao apenas na interface.
- Invalidar sessao de usuario inativo.

## 3. Arquitetura Geral

```text
Usuario
  -> Navegador
    -> Next.js Frontend
      -> Server Actions / API Routes
        -> Camada de servicos
          -> Prisma ORM
            -> PostgreSQL
```

### 3.1 Camadas sugeridas

```text
app/
  telas, layouts e rotas do Next.js

components/
  componentes reutilizaveis de interface

lib/
  autenticacao, prisma, permissoes, validacoes e utilitarios

services/
  regras de negocio de produtos, estoque, movimentacoes e inventario

prisma/
  schema do banco e migrations
```

### 3.2 Principio importante

As quantidades de estoque nunca devem ser alteradas diretamente pela interface de cadastro de produto.

Toda alteracao de saldo deve passar por um servico de movimentacao, para garantir:

- Atualizacao correta do saldo por local.
- Registro no historico.
- Validacao de saldo negativo.
- Auditoria por usuario.

### 3.3 Transacoes e concorrencia

Toda operacao que altera saldo deve ser executada em transacao atomica no banco de dados.

Operacoes obrigatoriamente transacionais:

- Entrada.
- Saida.
- Transferencia.
- Ajuste.
- Inventario com ajuste aplicado.
- Perda ou avaria.
- Estorno.

Regras:

- O saldo e a movimentacao devem ser gravados na mesma transacao.
- Se qualquer etapa falhar, nenhuma alteracao deve ser persistida.
- Saidas, transferencias, perdas e estornos devem validar saldo suficiente dentro da transacao.
- Operacoes concorrentes nao podem permitir saldo negativo.
- Quando possivel, usar atualizacao condicional no banco, como `quantity >= quantidade_solicitada`, para evitar corrida entre dois usuarios.
- Cada operacao deve criar um cabecalho em `StockMovement` e uma ou mais linhas em `StockMovementLine`.
- As linhas de movimentacao devem registrar saldo antes, variacao e saldo depois para cada local afetado.

## 4. Estrutura Inicial de Pastas

```text
estoque-vinhos/
  app/
    login/
    dashboard/
    produtos/
    locais/
    fornecedores/
    busca/
    movimentacoes/
    inventario/
    relatorios/
    usuarios/
    api/

  components/
    forms/
    tables/
    layout/
    feedback/
    inventory/

  lib/
    auth.ts
    prisma.ts
    permissions.ts
    validations.ts
    barcode.ts

  services/
    products.service.ts
    suppliers.service.ts
    locations.service.ts
    inventory.service.ts
    movements.service.ts
    audits.service.ts
    users.service.ts

  prisma/
    schema.prisma
    migrations/

  tests/
    unit/
    integration/
```

## 5. Modelo de Dados

## 5.1 Entidade: User

Representa um usuario do sistema.

Campos:

```text
id                 uuid
name               string
email              string unique
password_hash      string
role               enum: admin, estoque, consulta
status             enum: active, inactive
created_at         datetime
updated_at         datetime
```

Regras:

- Email deve ser unico.
- Senha nunca deve ser salva em texto puro.
- Usuario inativo nao pode acessar o sistema.

## 5.2 Entidade: Supplier

Representa um fornecedor.

Campos:

```text
id                 uuid
name               string
document           string nullable
phone              string nullable
email              string nullable
notes              text nullable
status             enum: active, inactive
created_at         datetime
updated_at         datetime
```

## 5.3 Entidade: ProductFamily

Representa o mesmo rotulo em diferentes safras.

Exemplo:

```text
Catena Malbec
  -> Catena Malbec 2020
  -> Catena Malbec 2021
  -> Catena Malbec 2022
```

Campos:

```text
id                 uuid
normalized_name    string
display_name       string
type               enum: wine, sparkling
supplier_id        uuid nullable
created_at         datetime
updated_at         datetime
```

Restricoes:

```text
unique(normalized_name, type, supplier_id)
```

Regras:

- Deve agrupar produtos que representam o mesmo rotulo em safras diferentes.
- Deve ser usado para validar codigo de barras repetido entre safras.
- Pode ser criado automaticamente a partir de nome, tipo e fornecedor durante o cadastro do produto.
- Quando `supplier_id` for nulo, a aplicacao deve tratar a unicidade com chave normalizada equivalente a `sem_fornecedor` ou indice unico parcial adequado.

## 5.4 Entidade: Product

Representa um vinho ou espumante.

Campos:

```text
id                 uuid
product_family_id  uuid
sku                string unique
name               string
type               enum: wine, sparkling
country            string nullable
supplier_id        uuid nullable
vintage            string nullable
barcode            string nullable
notes              text nullable
status             enum: active, inactive
created_at         datetime
updated_at         datetime
```

Regras:

- SKU interno e obrigatorio e unico.
- Todo produto deve estar vinculado a uma `ProductFamily`.
- Quando `ProductFamily.supplier_id` e `Product.supplier_id` estiverem preenchidos, os dois devem ser iguais.
- Codigo de barras pode ser nulo.
- Codigo de barras pode se repetir apenas entre produtos da mesma `ProductFamily` com safras diferentes.
- Quando houver codigo de barras repetido, a busca deve exigir escolha manual da safra correta.
- Produto inativo nao deve aparecer como opcao principal em novas movimentacoes.
- Produto com saldo positivo nao pode ser inativado.
- Para inativar produto com saldo, primeiro e necessario transferir, vender, ajustar ou zerar o saldo com justificativa.
- Quantidade total deve ser calculada pelos saldos em `InventoryBalance`.

## 5.5 Entidade: StorageLocation

Representa uma posicao fisica no estoque.

Campos:

```text
id                 uuid
name               string
code               string unique
type               enum: shelf, wooden_cellar, display, other
description        text nullable
status             enum: active, inactive
created_at         datetime
updated_at         datetime
```

Regras:

- Codigo do local deve ser unico.
- Local inativo nao pode receber novas movimentacoes.
- Local com saldo positivo nao pode ser inativado.
- Para inativar local com saldo, primeiro e necessario transferir ou ajustar os produtos vinculados.
- O codigo deve bater com uma etiqueta fisica no estoque.

## 5.6 Entidade: InventoryBalance

Representa o saldo de um produto em um local especifico.

Campos:

```text
id                   uuid
product_id           uuid
storage_location_id  uuid
quantity             integer
created_at           datetime
updated_at           datetime
```

Restricoes:

```text
unique(product_id, storage_location_id)
quantity >= 0
```

Regras:

- Um produto pode aparecer em varios locais.
- Um local pode conter varios produtos.
- O mesmo par produto/local so pode existir uma vez.
- O saldo total do produto e a soma dos saldos em todos os locais.

## 5.7 Entidade: StockMovement

Representa qualquer alteracao de estoque.

Campos:

```text
id                       uuid
product_id               uuid
movement_type            enum: entry, exit, transfer, adjustment, inventory, loss, reversal
quantity                 integer
source_location_id       uuid nullable
destination_location_id  uuid nullable
affected_location_id     uuid nullable
supplier_id              uuid nullable
inventory_audit_id       uuid nullable
import_batch_id          uuid nullable
idempotency_key          string nullable unique
reason                   string nullable
notes                    text nullable
user_id                  uuid
status                   enum: active, reversed
reversed_movement_id     uuid nullable
occurred_at              datetime
created_at               datetime
updated_at               datetime
```

Regras:

- `entry` exige local de destino.
- `exit` exige local de origem.
- `transfer` exige local de origem e local de destino.
- `adjustment` exige local afetado e justificativa.
- `inventory` exige local afetado e deve estar ligado a uma conferencia por `inventory_audit_id`.
- `loss` exige local afetado e justificativa.
- `reversal` deve referenciar a movimentacao original.
- `affected_location_id` deve ser usado para `adjustment`, `inventory` e `loss`.
- `quantity` e um resumo da movimentacao: quantidade entrada, retirada, transferida, perdida ou o valor absoluto do delta em ajuste/inventario.
- `idempotency_key` deve ser usado em importacoes e em formularios sensiveis para evitar duplicidade de envio.
- `occurred_at` representa quando a movimentacao aconteceu; `created_at` representa quando foi registrada no sistema.
- Movimentacoes nao podem ser apagadas.
- Para corrigir erro, criar uma movimentacao de estorno.

## 5.8 Entidade: StockMovementLine

Representa o impacto exato de uma movimentacao em um local de estoque.

Campos:

```text
id                   uuid
stock_movement_id    uuid
product_id           uuid
storage_location_id  uuid
quantity_before      integer
quantity_delta       integer
quantity_after       integer
created_at           datetime
```

Restricoes:

```text
unique(stock_movement_id, storage_location_id)
quantity_after = quantity_before + quantity_delta
quantity_after >= 0
```

Regras:

- Toda movimentacao que altera saldo deve ter pelo menos uma linha.
- Entrada gera uma linha positiva no local de destino.
- Saida gera uma linha negativa no local de origem.
- Transferencia gera duas linhas: negativa na origem e positiva no destino.
- Ajuste e inventario geram uma linha com o delta entre saldo anterior e saldo final.
- Perda ou avaria gera uma linha negativa no local afetado.
- Estorno gera linhas inversas as linhas da movimentacao original.

## 5.9 Entidade: InventoryAudit

Representa uma conferencia fisica de estoque.

Campos:

```text
id                   uuid
product_id           uuid
storage_location_id  uuid
expected_quantity    integer
counted_quantity     integer
difference           integer
status               enum: pending, adjusted, ignored
notes                text nullable
user_id              uuid
created_at           datetime
```

Regras:

- Diferenca deve ser calculada por `counted_quantity - expected_quantity`.
- Quando a divergencia for ajustada, deve gerar movimentacao do tipo `inventory` vinculada por `inventory_audit_id`.
- Divergencias podem ficar pendentes para revisao de administrador.

## 5.10 Entidade: ImportBatch

Representa uma tentativa de importacao de planilha.

Campos:

```text
id                 uuid
file_name          string
file_hash          string
status             enum: draft, validated, imported, failed
total_rows         integer
valid_rows         integer
error_rows         integer
user_id            uuid
created_at         datetime
updated_at         datetime
```

Restricoes:

```text
unique(file_hash)
```

Regras:

- A mesma planilha nao deve ser importada duas vezes.
- Importacao deve ter etapa de simulacao antes da aplicacao definitiva.
- Movimentacoes criadas pela importacao devem apontar para `import_batch_id`.
- Erros devem ser apresentados por linha da planilha.

## 6. Relacionamentos

```text
Supplier 1:N ProductFamily
ProductFamily 1:N Product
Supplier 1:N Product
Product 1:N InventoryBalance
StorageLocation 1:N InventoryBalance
Product 1:N StockMovement
StockMovement 1:N StockMovementLine
Product 1:N StockMovementLine
StorageLocation 1:N StockMovementLine
User 1:N StockMovement
User 1:N InventoryAudit
User 1:N ImportBatch
Product 1:N InventoryAudit
StorageLocation 1:N InventoryAudit
InventoryAudit 1:0..1 StockMovement como ajuste aplicado
ImportBatch 1:N StockMovement
StockMovement 1:1 StockMovement como estorno opcional
```

## 7. Permissoes

### 7.1 Admin

Pode:

- Gerenciar usuarios.
- Gerenciar produtos.
- Gerenciar fornecedores.
- Gerenciar locais.
- Registrar qualquer movimentacao.
- Realizar inventario.
- Aplicar ajustes.
- Estornar movimentacoes.
- Ver todos os relatorios.

### 7.2 Estoque

Pode:

- Consultar produtos.
- Registrar entradas.
- Registrar saidas.
- Registrar transferencias.
- Realizar inventario.
- Visualizar historico operacional.

Nao pode:

- Gerenciar usuarios.
- Estornar movimentacao sem permissao.
- Inativar produtos ou locais sem permissao.

### 7.3 Consulta

Pode:

- Buscar produto.
- Visualizar quantidade total.
- Visualizar localizacao fisica.

Nao pode:

- Alterar estoque.
- Criar produtos.
- Editar locais.
- Ver relatorios administrativos.

## 8. Regras de Negocio Criticas

### 8.1 Entrada

Validacoes:

- Produto deve existir e estar ativo.
- Local de destino deve existir e estar ativo.
- Quantidade deve ser maior que zero.

Efeito:

- Aumenta saldo do produto no local de destino.
- Cria movimentacao `entry`.
- Cria uma `StockMovementLine` positiva no local de destino.
- Operacao deve ocorrer em transacao.

### 8.2 Saida

Validacoes:

- Produto deve existir.
- Local de origem deve existir.
- Quantidade deve ser maior que zero.
- Saldo no local de origem deve ser suficiente.

Efeito:

- Reduz saldo do produto no local de origem.
- Cria movimentacao `exit`.
- Cria uma `StockMovementLine` negativa no local de origem.
- Operacao deve ocorrer em transacao.

### 8.3 Transferencia

Validacoes:

- Produto deve existir.
- Origem e destino devem existir e estar ativos.
- Origem e destino devem ser diferentes.
- Quantidade deve ser maior que zero.
- Saldo na origem deve ser suficiente.

Efeito:

- Reduz saldo na origem.
- Aumenta saldo no destino.
- Cria movimentacao `transfer`.
- Cria uma `StockMovementLine` negativa na origem.
- Cria uma `StockMovementLine` positiva no destino.
- Operacao deve ocorrer em transacao.

### 8.4 Ajuste Manual

Validacoes:

- Apenas admin ou usuario autorizado.
- Deve informar local afetado.
- Deve ter justificativa obrigatoria.
- Quantidade final nao pode ficar negativa.

Efeito:

- Corrige saldo no local.
- Cria movimentacao `adjustment`.
- Cria uma `StockMovementLine` com `quantity_before`, `quantity_after` e `quantity_delta`.
- Operacao deve ocorrer em transacao.

### 8.5 Inventario

Validacoes:

- Produto e local devem existir.
- Quantidade conferida deve ser zero ou maior.

Efeito:

- Cria registro em `InventoryAudit`.
- Se aprovado ajuste, cria movimentacao `inventory` vinculada ao `InventoryAudit`.
- Atualiza saldo do local.
- Cria uma `StockMovementLine` com `quantity_before`, `quantity_after` e `quantity_delta`.
- Operacao de ajuste deve ocorrer em transacao.

### 8.6 Estorno

Validacoes:

- Apenas admin ou usuario autorizado.
- Movimentacao original deve estar ativa.
- Deve ter justificativa.

Efeito:

- Cria movimentacao inversa do tipo `reversal`.
- Marca movimentacao original como `reversed`.
- Cria `StockMovementLine` inversa para cada linha da movimentacao original.
- Mantem historico completo.
- Operacao deve ocorrer em transacao.

Matriz de estorno:

```text
entry
-> reduz no local de destino original.

exit
-> aumenta no local de origem original.

transfer
-> aumenta na origem original e reduz no destino original.

adjustment
-> restaura o saldo anterior registrado em quantity_before.

inventory
-> restaura o saldo anterior registrado em quantity_before.

loss
-> aumenta no local afetado original.
```

Regras adicionais:

- Nao permitir estorno de movimentacao ja estornada.
- Nao permitir estorno de movimentacao do tipo `reversal` no MVP.
- Quando o estorno precisar reduzir saldo, validar saldo suficiente antes de aplicar.
- O estorno deve preservar o vinculo com a movimentacao original por `reversed_movement_id`.

### 8.7 Perda ou Avaria

Validacoes:

- Produto deve existir.
- Local afetado deve existir.
- Quantidade deve ser maior que zero.
- Saldo no local afetado deve ser suficiente.
- Deve ter justificativa obrigatoria.

Efeito:

- Reduz saldo do produto no local afetado.
- Cria movimentacao `loss`.
- Cria uma `StockMovementLine` negativa no local afetado.
- Operacao deve ocorrer em transacao.

## 9. Busca e Codigo de Barras

### 9.1 Busca por nome

Deve aceitar busca parcial e retornar:

- Nome.
- SKU.
- Safra.
- Pais.
- Fornecedor.
- Quantidade total.
- Locais com saldo.

### 9.2 Busca por SKU interno

Deve retornar um unico produto.

### 9.3 Busca por codigo de barras

Cenarios:

```text
0 produtos encontrados
-> Mostrar opcao de cadastrar novo produto.

1 produto encontrado
-> Abrir tela do produto diretamente.

2 ou mais produtos encontrados
-> Mostrar lista para usuario escolher safra correta.
```

### 9.4 Leitor de codigo de barras

Para o MVP, o leitor USB pode funcionar como teclado:

- Usuario clica no campo de busca.
- Leitor digita o codigo automaticamente.
- Sistema executa a busca ao receber Enter.

Leitura por camera pode entrar depois como melhoria.

## 10. Rotas de Interface

```text
/login
/dashboard
/produtos
/produtos/novo
/produtos/[id]
/locais
/locais/novo
/locais/[id]
/fornecedores
/busca
/movimentacoes
/movimentacoes/entrada
/movimentacoes/saida
/movimentacoes/transferencia
/movimentacoes/ajuste
/movimentacoes/perda
/movimentacoes/[id]
/inventario
/inventario/novo
/relatorios/estoque-atual
/relatorios/divergencias
/relatorios/produtos-parados
/relatorios/movimentacoes
/importacao
/usuarios
```

## 11. Rotas de API

As rotas podem ser implementadas como API Routes ou Server Actions. A nomenclatura abaixo serve como contrato inicial.

### 11.1 Auth

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### 11.2 Produtos

```text
GET    /api/products
POST   /api/products
GET    /api/products/:id
PATCH  /api/products/:id
POST   /api/products/:id/inactivate
GET    /api/products/search?q=
GET    /api/products/barcode/:barcode
GET    /api/products/sku/:sku
```

### 11.3 Fornecedores

```text
GET    /api/suppliers
POST   /api/suppliers
GET    /api/suppliers/:id
PATCH  /api/suppliers/:id
POST   /api/suppliers/:id/inactivate
```

### 11.4 Locais

```text
GET    /api/locations
POST   /api/locations
GET    /api/locations/:id
PATCH  /api/locations/:id
POST   /api/locations/:id/inactivate
GET    /api/locations/:id/products
```

### 11.5 Estoque e movimentacoes

```text
GET  /api/inventory/balances
GET  /api/inventory/product/:productId
POST /api/movements/entry
POST /api/movements/exit
POST /api/movements/transfer
POST /api/movements/adjustment
POST /api/movements/loss
POST /api/movements/:id/reversal
GET  /api/movements
GET  /api/movements/:id
```

### 11.6 Inventario

```text
POST /api/audits
GET  /api/audits
GET  /api/audits/:id
POST /api/audits/:id/apply-adjustment
POST /api/audits/:id/ignore
```

### 11.7 Relatorios

```text
GET /api/reports/current-stock
GET /api/reports/divergences
GET /api/reports/inactive-products?days=90
GET /api/reports/movements
```

### 11.8 Usuarios

```text
GET   /api/users
POST  /api/users
GET   /api/users/:id
PATCH /api/users/:id
POST  /api/users/:id/inactivate
```

### 11.9 Importacao

```text
POST /api/imports/validate
POST /api/imports
GET  /api/imports
GET  /api/imports/:id
GET  /api/imports/:id/errors
```

## 12. Contratos de Payload

### 12.1 Criar produto

```json
{
  "productFamilyId": "uuid opcional",
  "sku": "CAT-MAL-2021-750",
  "name": "Catena Malbec",
  "type": "wine",
  "country": "Argentina",
  "supplierId": "uuid",
  "vintage": "2021",
  "barcode": "7794450000000",
  "notes": "Garrafa 750ml"
}
```

Observacao:

- Se `productFamilyId` nao for enviado, o backend deve localizar ou criar a familia pelo nome normalizado, tipo e fornecedor.

### 12.2 Entrada de estoque

```json
{
  "productId": "uuid",
  "quantity": 12,
  "destinationLocationId": "uuid",
  "supplierId": "uuid",
  "notes": "Entrada inicial"
}
```

### 12.3 Saida de estoque

```json
{
  "productId": "uuid",
  "quantity": 2,
  "sourceLocationId": "uuid",
  "reason": "venda",
  "notes": "Retirado para venda no balcao"
}
```

### 12.4 Transferencia

```json
{
  "productId": "uuid",
  "quantity": 4,
  "sourceLocationId": "uuid",
  "destinationLocationId": "uuid",
  "notes": "Reorganizacao de prateleira"
}
```

### 12.5 Inventario

```json
{
  "productId": "uuid",
  "storageLocationId": "uuid",
  "countedQuantity": 7,
  "notes": "Conferencia semanal"
}
```

### 12.6 Ajuste manual

```json
{
  "productId": "uuid",
  "affectedLocationId": "uuid",
  "newQuantity": 9,
  "reason": "correcao_operacional",
  "notes": "Ajuste aprovado apos recontagem"
}
```

Observacao:

- `newQuantity` representa o saldo final desejado.
- O backend deve calcular e registrar `quantity_before`, `quantity_after` e `quantity_delta` em `StockMovementLine`.

### 12.7 Perda ou avaria

```json
{
  "productId": "uuid",
  "affectedLocationId": "uuid",
  "quantity": 1,
  "reason": "avaria",
  "notes": "Garrafa quebrada durante manuseio"
}
```

### 12.8 Estorno

```json
{
  "reason": "erro_de_lancamento",
  "notes": "Movimentacao registrada no produto incorreto"
}
```

## 13. Telas Principais

## 13.1 Login

Elementos:

- Email.
- Senha.
- Botao de entrar.
- Mensagem de erro clara.

## 13.2 Dashboard

Indicadores:

- Total de produtos ativos.
- Total de unidades em estoque.
- Produtos zerados.
- Produtos parados.
- Divergencias pendentes.
- Ultimas movimentacoes.

## 13.3 Busca Rapida

Prioridade maxima de usabilidade.

Elementos:

- Campo grande de busca.
- Suporte a leitor de codigo de barras.
- Resultado com quantidade total.
- Lista de locais e quantidades.
- Acoes rapidas: entrada, saida, transferencia, inventario.

## 13.4 Produtos

Elementos:

- Tabela com filtros.
- Cadastro e edicao.
- Status ativo/inativo.
- Visualizacao de saldos por local.
- Historico do produto.

## 13.5 Locais

Elementos:

- Lista de locais.
- Codigo interno.
- Tipo do local.
- Produtos armazenados no local.

## 13.6 Movimentacoes

Elementos:

- Abas ou paginas para entrada, saida, transferencia e ajuste.
- Historico filtravel.
- Detalhe de movimentacao.
- Acao de estorno para usuarios autorizados.

## 13.7 Inventario

Elementos:

- Conferencia por produto.
- Conferencia por local.
- Quantidade esperada.
- Quantidade encontrada.
- Diferenca.
- Acao de aplicar ajuste ou deixar pendente.

## 13.8 Relatorios

Relatorios iniciais:

- Estoque atual.
- Divergencias.
- Produtos parados.
- Historico de movimentacoes.

Filtros:

- Produto.
- Local.
- Fornecedor.
- Periodo.
- Tipo de movimentacao.

## 14. Componentes Reutilizaveis

```text
ProductSearchInput
BarcodeInput
ProductForm
LocationForm
SupplierForm
InventoryBalanceTable
MovementForm
MovementHistoryTable
AuditForm
ReportFilters
StatusBadge
ConfirmDialog
PermissionGate
```

## 15. Validacoes

### 15.1 Frontend

- Campos obrigatorios.
- Quantidade maior que zero.
- Email valido.
- Avisos antes de operacoes criticas.
- Mensagens claras para erro de saldo insuficiente.

### 15.2 Backend

Todas as validacoes criticas devem ser repetidas no backend:

- Permissao do usuario.
- Produto ativo.
- Local ativo.
- Saldo suficiente.
- Restricao de saldo nao negativo.
- SKU unico.
- Local unico.
- Produto com saldo positivo nao pode ser inativado.
- Local com saldo positivo nao pode ser inativado.
- Estorno sem duplicidade.
- Importacao sem duplicidade por `file_hash` e `idempotency_key`.
- Datas persistidas em UTC.

## 16. Testes Recomendados

### 16.1 Testes unitarios

Prioridade:

- Entrada aumenta saldo.
- Saida reduz saldo.
- Saida bloqueia saldo insuficiente.
- Transferencia move saldo entre locais.
- Ajuste exige justificativa.
- Perda ou avaria reduz saldo e exige justificativa.
- Inventario calcula divergencia.
- Estorno inverte movimentacao original.
- Estorno de transferencia inverte origem e destino corretamente.
- Duas saidas concorrentes nao podem deixar saldo negativo.
- Movimento registra `quantity_before`, `quantity_delta` e `quantity_after`.
- Produto ou local com saldo positivo nao pode ser inativado.

### 16.2 Testes de integracao

Prioridade:

- Criar produto e registrar entrada.
- Buscar produto por codigo de barras.
- Transferir produto entre locais.
- Registrar inventario com divergencia.
- Aplicar ajuste de inventario.
- Registrar perda ou avaria.
- Estornar movimentacao.
- Validar importacao sem aplicar dados.
- Bloquear segunda aplicacao da mesma planilha.
- Garantir que importacao com erro nao persiste nenhuma linha.

### 16.3 Testes manuais

Fluxos obrigatorios para validar antes de usar na loja:

- Cadastrar produto novo.
- Cadastrar local.
- Registrar entrada.
- Buscar por leitor de codigo de barras.
- Registrar saida.
- Transferir local.
- Conferir inventario.
- Gerar relatorio de estoque atual.
- Simular importacao inicial.
- Testar restauracao de backup em ambiente de teste.

## 17. Dados Iniciais

O sistema deve iniciar com:

- Um usuario administrador.
- Locais padrao cadastrados, se a loja ja tiver etiquetas definidas.
- Fornecedores principais.
- Produtos importados por planilha, se houver base existente.

Exemplo de locais:

```text
P-A-N1
P-A-N2
P-B-N1
AM-01-N01
AM-01-N02
EXP-01
```

## 18. Importacao Inicial de Produtos

Se a loja ja tiver uma planilha, recomenda-se importar os dados iniciais.

A importacao deve ser feita em duas etapas:

```text
1. Validacao/simulacao
-> Lê a planilha.
-> Valida produtos, fornecedores, locais, codigos de barras e quantidades.
-> Mostra erros e avisos sem alterar o banco.

2. Aplicacao definitiva
-> Executa a importacao validada.
-> Cria produtos, saldos e movimentacoes de entrada inicial.
-> Gera relatorio final.
```

Colunas esperadas:

```text
sku
name
type
country
supplier
vintage
barcode
quantity
location_code
notes
```

Regras:

- Se produto nao existir, criar.
- Se local nao existir, marcar erro na importacao.
- Quantidade importada deve gerar movimentacao de entrada inicial.
- Importacao deve gerar relatorio de sucessos e erros.
- Importacao deve usar `file_hash` para evitar que a mesma planilha seja aplicada duas vezes.
- Importacao deve usar `idempotency_key` nas movimentacoes criadas.
- No MVP, a importacao definitiva deve ser all-or-nothing: se qualquer linha falhar na aplicacao, nenhuma linha deve ser persistida.
- A aplicacao definitiva deve ocorrer em uma unica transacao de lote.
- Produtos duplicados na mesma planilha devem ser detectados antes da aplicacao.
- O relatorio de importacao deve informar linhas criadas, ignoradas, atualizadas e com erro.
- A importacao deve preservar o vinculo das entradas iniciais com `import_batch_id`.

## 19. Requisitos Nao Funcionais

- Interface deve carregar rapidamente em computador simples.
- Busca deve responder em poucos segundos.
- Sistema deve funcionar bem em celular e tablet.
- Banco deve ter backup automatico.
- Datas e horas devem ser armazenadas em UTC.
- Datas e horas devem ser exibidas no fuso horario local da loja, inicialmente `America/Sao_Paulo`.
- Filtros por periodo devem deixar claro se incluem inicio e fim do dia.
- Toda acao critica deve ter historico.
- Erros devem ser registrados para diagnostico.
- Interface deve priorizar operacao, nao aparencia decorativa.

## 19.1 Backup e recuperacao

Requisitos minimos:

- Backup automatico diario do banco de dados.
- Retencao minima de 30 backups diarios.
- Retencao minima de 12 backups mensais.
- Teste de restauracao pelo menos uma vez por trimestre.
- RPO inicial: perda maxima aceitavel de ate 24 horas de dados.
- RTO inicial: sistema restaurado em ate 4 horas apos incidente critico.
- Backup deve incluir banco de dados e arquivos de importacao relevantes, se forem armazenados.
- Acesso aos backups deve ser restrito a usuarios administrativos tecnicos.

## 20. Deploy Inicial

Recomendacao para MVP:

- Frontend/backend: Vercel ou Railway.
- Banco: Supabase, Neon, Railway PostgreSQL ou Render PostgreSQL.
- Backup: backup automatico diario do banco com retencao e teste de restauracao.
- Ambiente separado: desenvolvimento e producao.

Variaveis de ambiente:

```text
DATABASE_URL
AUTH_SECRET
APP_URL
```

Observacao:

- Os nomes exatos das variaveis podem variar conforme a biblioteca de autenticacao escolhida.
- O importante e separar segredo de autenticacao, URL publica da aplicacao e string de conexao do banco.

## 21. Plano de Desenvolvimento

### Sprint 1: Base do projeto

- Criar projeto Next.js.
- Configurar TypeScript.
- Configurar Prisma.
- Criar schema inicial.
- Configurar banco PostgreSQL.
- Criar layout base.
- Criar autenticacao.
- Definir middleware de permissao.
- Configurar padrao de datas em UTC.

### Sprint 2: Cadastros principais

- Produtos.
- Fornecedores.
- Locais.
- Usuarios e permissoes basicas.

### Sprint 3: Estoque operacional

- Entrada.
- Saida.
- Transferencia.
- Perda ou avaria.
- Saldo por local.
- Historico de movimentacoes.
- Transacoes de banco para operacoes de saldo.

### Sprint 4: Busca rapida

- Busca por nome.
- Busca por SKU.
- Busca por codigo de barras.
- Tela de resultado com localizacoes.
- Acoes rapidas a partir da busca.

### Sprint 5: Inventario e confiabilidade

- Inventario por produto.
- Inventario por local.
- Registro de divergencias.
- Ajustes com justificativa.
- Estorno de movimentacoes.
- Linhas de movimentacao com saldo antes, delta e saldo depois.

### Sprint 6: Relatorios e preparacao para uso

- Estoque atual.
- Produtos parados.
- Divergencias.
- Historico filtravel.
- Importacao inicial por planilha, se necessaria.
- Simulacao e relatorio de importacao.
- Politica de backup e restauracao.
- Revisao geral de seguranca e permissao.

## 22. Criterios de Aceite do MVP

O MVP pode ser considerado pronto quando:

- Usuario consegue cadastrar produto, local e fornecedor.
- Usuario consegue registrar entrada, saida e transferencia.
- Sistema calcula saldo total e saldo por local corretamente.
- Busca por nome, SKU e codigo de barras funciona.
- Usuario consegue encontrar rapidamente onde esta um vinho.
- Inventario registra divergencias.
- Ajustes geram historico.
- Perdas e avarias geram historico.
- Movimentacoes podem ser estornadas por usuario autorizado.
- Operacoes de saldo sao transacionais e nao permitem saldo negativo em concorrencia.
- Movimentacoes registram saldo antes, delta e saldo depois em cada local afetado.
- Produto e local com saldo positivo nao podem ser inativados.
- Importacao inicial possui validacao previa e bloqueio contra duplicidade.
- Importacao definitiva e all-or-nothing.
- Datas sao armazenadas em UTC e exibidas no fuso local da loja.
- Backup possui retencao definida e restauracao testada.
- Relatorios principais funcionam.
- Permissoes impedem alteracoes por usuario de consulta.

## 23. Proxima Decisao

Antes de iniciar o codigo, confirmar:

- A loja usara leitor de codigo de barras USB no MVP.
- A primeira versao tera importacao de planilha.
- A loja ja possui uma lista dos locais fisicos do estoque.
- O deploy sera local, em nuvem ou ambos.
- Quem serao os usuarios iniciais e seus perfis.
