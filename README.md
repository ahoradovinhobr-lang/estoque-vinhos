# Estoque Vinhos

Webapp para controle de estoque, localizacao fisica e movimentacoes auditaveis de uma loja de vinhos e espumantes.

## Stack

- Next.js
- React
- TypeScript
- Prisma
- PostgreSQL
- Tailwind CSS

## Pre-requisitos

- Node.js com npm.
- PostgreSQL acessivel pela variavel `DATABASE_URL`.
- `AUTH_SECRET` com pelo menos 32 caracteres.

## Primeiros comandos

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

No Windows, se Node.js/npm ainda nao estiverem instalados, execute:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-local.ps1
```

## Validacao antes de publicar

```bash
npm run build
npm test -- --run
```

No Railway, o healthcheck usa `/api/health`.
No GitHub, o workflow `.github/workflows/ci.yml` executa instalacao,
Prisma generate, testes e build em pushes para `main` e pull requests.

## Documentacao

- `DOCUMENTACAO_WEBAPP_ESTOQUE_VINHOS.md`
- `ESPECIFICACAO_TECNICA_MVP.md`
- `DEPLOY_RAILWAY.md`
