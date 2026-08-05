# Resumo Executivo - Pendências Backend

**Data:** 2026-01-23  
**Documento completo:** `BACKEND_REQUIREMENTS.md`

---

## 🎯 Visão Geral

**Total de pendências:** 3 requests com ações necessárias

| Request | Prioridade | Endpoints | Migrations | Configurações | Prazo |
|---------|-----------|-----------|------------|---------------|-------|
| Request 2: Busca Aproximada | **P0 - CRÍTICA** | 3 | 1 | 0 | 3 dias |
| Request 7: Compartilhamento | **P1 - ALTA** | 5 | 2 | 3 | 7 dias |
| Request 8: Planos Assinatura | **P0 - CRÍTICA** | 5 | 3 | 3 | 5 dias |

---

## 📊 Request 2: Busca Aproximada

### Problema
Frontend implementou busca normalizada (lowercase, sem acentos), mas backend ainda faz busca exata.

### Solução

**Migrations:**
```sql
-- PostgreSQL
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE INDEX idx_posts_description_lower ON posts (LOWER(UNACCENT(description)));
CREATE INDEX idx_products_name_lower ON products (LOWER(UNACCENT(name)));
CREATE INDEX idx_users_name_lower ON users (LOWER(UNACCENT(name)));
```

**Endpoints a modificar:**
1. `GET /api/posts` - Adicionar `WHERE LOWER(UNACCENT(description)) LIKE '%' || LOWER(UNACCENT(:search)) || '%'`
2. `GET /api/products` - Buscar em `name` e `description` com UNACCENT
3. `GET /api/users/search` - Buscar em `name` e `username` com UNACCENT

**Testes essenciais:**
- ✅ "cafe" encontra "café"
- ✅ "SILVA" encontra "silva"
- ✅ "joao" encontra "João Silva"

---

## 🔗 Request 7: Compartilhamento

### Problema
Frontend exibe contador `total_shares` e tem botão de compartilhamento, mas backend não registra.

### Solução

**Migrations:**
```sql
-- Tabela de analytics
CREATE TABLE post_shares (
  id SERIAL PRIMARY KEY,
  post_id INT NOT NULL REFERENCES posts(id),
  user_id INT NOT NULL REFERENCES users(id),
  share_method VARCHAR(20) NOT NULL,
  shared_with_user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contador na tabela posts
ALTER TABLE posts ADD COLUMN total_shares INT DEFAULT 0;
```

**Endpoints a criar:**
1. `POST /api/posts/:id/share` - Registrar compartilhamento (WhatsApp/outros)
2. `POST /api/posts/:id/share/internal` - Compartilhamento interno com usuários
3. `GET /api/users/shareable` - Listar usuários para compartilhar
4. `GET /api/posts/shared-with-me` - Posts compartilhados comigo
5. `GET /api/posts/:id` - Garantir retorno de `total_shares`

**Configurações servidor web:**
- `.well-known/apple-app-site-association` - Universal Links (iOS)
- `.well-known/assetlinks.json` - App Links (Android)
- Rotas de fallback: `/post/:id`, `/product/:id`, `/profile/:userId`

---

## 💰 Request 8: Planos de Assinatura

### Problema
Mudanças nos planos (preços e regras) precisam de backend para validação.

### Mudanças nos planos:

| Plano | Preço Antes | Preço Depois | Novidades |
|-------|-------------|--------------|-----------|
| Free | R$ 0,00 | R$ 0,00 | **Limite total:** 3 criados |
| Pro | R$ 14,90 | **R$ 24,90** | **Cooldown:** 6 meses para editar<br>**Limite:** 10 criados |
| Premium | R$ 24,90 | **R$ 39,90** | **Edição ilimitada** |

### Solução

**Migrations:**
```sql
-- Tabela plans
ALTER TABLE plans 
ADD COLUMN edit_cooldown_months INT DEFAULT 0,
ADD COLUMN max_total_products_created INT DEFAULT 9999,
ADD COLUMN can_edit_anytime BOOLEAN DEFAULT FALSE;

-- Tabela users
ALTER TABLE users 
ADD COLUMN total_products_created INT DEFAULT 0,
ADD COLUMN active_products_count INT DEFAULT 0;

-- Tabela products
ALTER TABLE products 
ADD COLUMN last_edit_date TIMESTAMP NULL;

-- Atualizar preços
UPDATE plans SET value = '24.90' WHERE name = 'Pro';
UPDATE plans SET value = '39.90' WHERE name = 'Premium';
```

**Endpoints a modificar:**
1. `POST /api/products` - Validar limites (total_created, active_count)
2. `PUT /api/products/:id` - Validar cooldown de edição
3. `DELETE /api/products/:id` - Decrementar `active_products_count`
4. `GET /api/users/me` - Retornar novos campos
5. `GET /api/plans` - Retornar novos campos

**Validações críticas:**
- Free: Bloquear 4º produto (total_created >= 3)
- Pro: Bloquear 11º produto (total_created >= 10)
- Pro: Bloquear edição antes de 6 meses
- Premium: Permitir edição ilimitada

**Configurações externas:**
- Apple App Store Connect: Atualizar preços (aguardar aprovação 1-3 dias)
- Google Play Console: Atualizar preços
- Stripe: Criar novos `price_id`

---

## ✅ Checklist Rápido

### Banco de Dados (9 tarefas)

- [ ] **Request 2:** Extensão `unaccent` (PostgreSQL)
- [ ] **Request 2:** Índices de busca aproximada
- [ ] **Request 7:** Tabela `post_shares`
- [ ] **Request 7:** Campo `total_shares` na tabela `posts`
- [ ] **Request 8:** 3 campos na tabela `plans`
- [ ] **Request 8:** 2 campos na tabela `users`
- [ ] **Request 8:** 1 campo na tabela `products`
- [ ] **Request 8:** Atualizar preços (Pro/Premium)
- [ ] **Request 8:** Popular contadores existentes

### Endpoints (13 tarefas)

**Request 2 - Busca:**
- [ ] `GET /api/posts` - Busca aproximada
- [ ] `GET /api/products` - Busca aproximada
- [ ] `GET /api/users/search` - Busca aproximada

**Request 7 - Compartilhamento:**
- [ ] `POST /api/posts/:id/share`
- [ ] `POST /api/posts/:id/share/internal`
- [ ] `GET /api/users/shareable`
- [ ] `GET /api/posts/shared-with-me`
- [ ] `GET /api/posts/:id` - Retornar `total_shares`

**Request 8 - Planos:**
- [ ] `POST /api/products` - Validações
- [ ] `PUT /api/products/:id` - Cooldown
- [ ] `DELETE /api/products/:id` - Contadores
- [ ] `GET /api/users/me` - Novos campos
- [ ] `GET /api/plans` - Novos campos

### Servidor Web (5 tarefas)

- [ ] `.well-known/apple-app-site-association`
- [ ] `.well-known/assetlinks.json`
- [ ] Rota `GET /post/:id` (fallback)
- [ ] Rota `GET /product/:id` (fallback)
- [ ] Rota `GET /profile/:userId` (fallback)

### Plataformas Externas (6 tarefas)

**Apple App Store Connect:**
- [ ] Atualizar preço Pro (R$ 24,90)
- [ ] Atualizar preço Premium (R$ 39,90)

**Google Play Console:**
- [ ] Atualizar preço Pro
- [ ] Atualizar preço Premium

**Stripe:**
- [ ] Criar Price Pro (BRL 24.90)
- [ ] Criar Price Premium (BRL 39.90)

---

## 📅 Cronograma Sugerido

### Semana 1 (5 dias úteis)

**Dia 1-2: Request 8 (Planos) - P0**
- Migrations e atualização de preços
- Validações nos endpoints

**Dia 3: Request 2 (Busca) - P0**
- Extensão unaccent + modificar endpoints

**Dia 4: Testes P0**
- Validar planos e busca

**Dia 5: Deploy P0 + IAP**
- Configurações Apple/Google/Stripe

### Semana 2 (5 dias úteis)

**Dia 6-8: Request 7 (Compartilhamento) - P1**
- Migrations + endpoints
- Configuração deep links

**Dia 9-10: Testes P1**
- Validar compartilhamento
- Testar deep links

---

## 🚨 Riscos e Alertas

### Request 8 - Planos

**⚠️ Alto Risco de Churn:**
- Pro: +67% de aumento (R$ 14,90 → R$ 24,90)
- Premium: +60% de aumento (R$ 24,90 → R$ 39,90)

**Recomendações:**
1. Avisar usuários com 30 dias de antecedência
2. Considerar grandfathering (manter preço antigo para usuários atuais)
3. Destacar novos benefícios (cooldown, limites)

**⏰ Dependências Externas:**
- Aprovação Apple: 1-3 dias (não previsível)
- Pode exigir nova versão do app

### Request 7 - Deep Links

**⚠️ Configuração Complexa:**
- Requer acesso ao servidor web (Nginx/Apache)
- Requer certificado SSL válido
- Falhas silenciosas (links não funcionam, sem erro)

**Validação obrigatória:**
- https://search.developer.apple.com/appsearch-validation-tool (iOS)
- https://digitalassetlinks.googleapis.com (Android)

---

## 📞 Próximos Passos

1. **Revisar** este documento e `BACKEND_REQUIREMENTS.md`
2. **Priorizar** tarefas P0 (Busca + Planos)
3. **Criar** branch `backend/feature/frontend-sync`
4. **Implementar** migrations primeiro (dados)
5. **Implementar** endpoints (lógica)
6. **Testar** localmente antes de deploy
7. **Comunicar** usuários (mudanças de preço)
8. **Deploy** e monitorar logs

**Documento detalhado:** `BACKEND_REQUIREMENTS.md` (1605 linhas)
