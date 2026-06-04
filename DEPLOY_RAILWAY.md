# Deploy no Railway

Este guia descreve o caminho recomendado para rodar o MVP na nuvem usando GitHub + Railway.

## 1. Criar repositorio no GitHub

Nome sugerido:

```text
estoque-vinhos
```

Depois, subir todos os arquivos deste projeto para o repositorio.

## 2. Criar projeto no Railway

1. Acessar Railway.
2. Criar novo projeto.
3. Escolher deploy a partir do repositorio GitHub `estoque-vinhos`.
4. Adicionar um servico PostgreSQL no mesmo projeto.

## 3. Variaveis de ambiente

Configurar no servico web:

```text
DATABASE_URL
AUTH_SECRET
APP_URL
APP_TIMEZONE=America/Sao_Paulo
```

Observacoes:

- `DATABASE_URL` deve apontar para o PostgreSQL do Railway.
- `AUTH_SECRET` deve ser um segredo forte.
- `APP_URL` deve ser a URL publica gerada pelo Railway.

## 4. Build e start

O arquivo `railway.json` define:

```text
Build: npm run build
Start: npm run start:migrate
```

O script `start:migrate` executa:

```text
prisma migrate deploy && next start
```

Assim, as migrations sao aplicadas antes do app iniciar.

## 5. Primeiro teste

Depois do deploy, acessar a URL publica e validar:

- Dashboard carrega.
- Busca rapida abre.
- Rotas principais respondem.
- Logs nao mostram erro de Prisma ou banco.

## 6. Proximas etapas

- Criar migration inicial quando o banco estiver conectado.
- Criar seed de usuario administrador.
- Implementar cadastro de produtos, locais e fornecedores.

