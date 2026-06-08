# Auditoria de seguranca - Estoque Vinhos

Data: 2026-06-08

## Escopo

Auditoria focada no webapp de estoque em producao, cobrindo autenticacao,
usuarios, sessoes, autorizacao, protecoes HTTP, operacao em Railway/Postgres e
preparacao para uso com dados reais.

## Referencias usadas

- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- Next.js headers: https://nextjs.org/docs/app/api-reference/config/next-config-js/headers

## Melhorias aplicadas neste sprint

1. Politica de senha forte
   - Minimo de 15 caracteres.
   - Limite de 72 bytes para evitar truncamento silencioso em bcrypt.
   - Bloqueio de senhas comuns conhecidas.
   - Senha temporaria de usuario novo exige troca no primeiro acesso.

2. Troca de senha propria
   - Nova rota `/minha-conta/senha`.
   - Exige senha atual antes de alterar.
   - Invalida sessoes antigas ao trocar senha.

3. Gestao de usuarios
   - Admin pode resetar senha temporaria de outro usuario.
   - Reset de senha obriga troca no proximo acesso.
   - Admin nao pode resetar a propria senha por esse caminho; deve usar
     `Minha conta`.

4. Protecao contra tentativa automatizada
   - Bloqueio temporario apos 5 falhas de login.
   - Bloqueio por 15 minutos.
   - Tentativas com usuario inexistente continuam retornando resposta generica.

5. Sessao
   - Cookie de sessao `HttpOnly`, `Secure` em producao e `SameSite=Strict`.
   - Cookie com prefixo `__Host-` em producao.
   - Sessao reduzida para 4 horas.
   - `sessionVersion` invalida tokens antigos apos troca/reset de senha.

6. Headers HTTP
   - `Strict-Transport-Security`.
   - `Content-Security-Policy` minima com `frame-ancestors 'none'`.
   - `X-Frame-Options: DENY`.
   - `X-Content-Type-Options: nosniff`.
   - `Referrer-Policy: same-origin`.
   - `Permissions-Policy` bloqueando camera, microfone, geolocalizacao e
     recursos nao usados.

## Achados atuais

### P1 - Remover segredo de bootstrap da Railway

`INITIAL_ADMIN_PASSWORD` deve ser removida do servico Railway depois que o
administrador trocar a senha em `/minha-conta/senha`.

Risco: manutencao desnecessaria de segredo operacional em variavel de ambiente.

Acao recomendada: apos trocar a senha, apagar `INITIAL_ADMIN_PASSWORD`. Manter
`AUTH_SECRET` e `DATABASE_URL`.

### P1 - MFA ainda nao implementado

O sistema usa senha unica. Para contas admin, isso ainda e risco relevante.

Acao recomendada: adicionar segundo fator para administradores antes de uso em
larga escala, ou restringir acesso por rede/VPN enquanto MFA nao existir.

### P1 - Logs/auditoria de autenticacao incompletos

O app registra movimentos de estoque por usuario, mas ainda nao registra eventos
de seguranca como login, falha de login, lockout, troca de senha e reset.

Acao recomendada: criar tabela `security_events` com usuario, tipo de evento,
data, IP/origem quando disponivel e metadados seguros.

### P2 - Sem recuperacao segura de senha

O reset atual e administrativo. Nao ha fluxo de esquecimento de senha por email.

Acao recomendada: manter reset administrativo por enquanto. Quando houver email,
implementar token de uso unico, expiracao curta e resposta generica.

### P2 - Sem revisao automatizada de dependencias

Nao ha pipeline de CI visivel para lint/build/auditoria de dependencias.

Acao recomendada: adicionar GitHub Actions para `npm ci`, `npm run build` e
`npm audit --audit-level=high`.

### P2 - Backup e restauracao dependem do Railway/Postgres

Nao ha rotina documentada de restore testado.

Acao recomendada: configurar retencao de backup, testar restore em ambiente
separado e documentar RPO/RTO.

### P3 - CSP ainda e minima

A CSP atual protege enquadramento, formularios e objetos, mas nao restringe
scripts/estilos com nonce.

Acao recomendada: evoluir para CSP com nonce quando o app tiver pipeline de
build/teste confiavel, para evitar quebra silenciosa de hidratacao do Next.js.

## Checklist antes de carga real

- Trocar a senha do usuario `gerente`.
- Remover `INITIAL_ADMIN_PASSWORD` do Railway.
- Criar pelo menos um usuario `ESTOQUE` e um usuario `CONSULTA`.
- Testar login, logout, troca de senha e reset administrativo.
- Validar headers em producao.
- Configurar backup/retencao no Postgres.
- Criar CI de build antes de novos sprints grandes.

## Decisao tecnica

O app ainda nao deve receber carga real de estoque antes da conclusao dos P1:
remover segredo de bootstrap, definir estrategia de MFA/restricao de acesso e
registrar eventos de seguranca.
