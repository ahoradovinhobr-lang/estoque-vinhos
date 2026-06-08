# Auditoria de seguranca - Estoque Vinhos

Data: 2026-06-08

## Escopo

Auditoria focada no webapp de estoque em producao, cobrindo autenticacao,
usuarios, sessoes, autorizacao, protecoes HTTP, operacao em Railway/Postgres e
preparacao para uso com dados reais.

## Referencias usadas

- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Multifactor Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- NIST SP 800-63B: https://pages.nist.gov/800-63-4/sp800-63b.html
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

7. Eventos de seguranca
   - Registro de login com sucesso, falha de login, bloqueio temporario,
     logout, troca de senha, reset de senha e gestao de usuarios.
   - Nova rota administrativa `/seguranca` para consultar os eventos recentes.
   - Eventos incluem ator, alvo, email, IP, user-agent e metadados minimos.

8. Segredo de bootstrap removido
   - `INITIAL_ADMIN_PASSWORD` foi removida do Railway apos a troca da senha do
     usuario `gerente`.

9. MFA para administradores
   - MFA obrigatorio para usuarios `ADMIN`.
   - TOTP compativel com aplicativos autenticadores.
   - Chave MFA criptografada no banco com material derivado do `AUTH_SECRET`.
   - Codigo MFA exigido em etapa separada antes da criacao da sessao completa.
   - Cookie temporario de desafio MFA com expiracao curta.
   - Bloqueio temporario apos 5 falhas de MFA.
   - Codigos de recuperacao gerados uma unica vez e armazenados com hash.
   - Reset administrativo de MFA para perda de dispositivo.
   - Eventos de MFA incluidos na auditoria de seguranca.

## Achados atuais

### P1 - MFA precisa ser ativado e testado em producao

O controle de MFA foi implementado no app, mas precisa ser publicado, ativado
no usuario `gerente` e validado em producao antes da carga real.

Acao recomendada: apos o deploy, configurar o autenticador do `gerente`, guardar
os codigos de recuperacao e testar login com senha + MFA.

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

- Trocar a senha do usuario `gerente`. Concluido.
- Remover `INITIAL_ADMIN_PASSWORD` do Railway. Concluido.
- Publicar o sprint de MFA.
- Configurar MFA do usuario `gerente`.
- Guardar os codigos de recuperacao fora do app.
- Testar login com senha + MFA.
- Criar pelo menos um usuario `ESTOQUE` e um usuario `CONSULTA`.
- Testar login, logout, troca de senha e reset administrativo.
- Validar headers em producao.
- Configurar backup/retencao no Postgres.
- Criar CI de build antes de novos sprints grandes.

## Decisao tecnica

O app ainda nao deve receber carga real de estoque antes do deploy/teste do MFA,
da criacao dos usuarios operacionais reais e da definicao minima de backup.
