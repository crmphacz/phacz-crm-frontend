# Pendências de Backend - Farmsilo App

**Data:** 2026-01-23  
**Branch Frontend:** `test-feature`  
**Versão do Documento:** 1.0

---

## 📋 Índice

1. [Resumo Executivo](#resumo-executivo)
2. [Request 1: Texto Marketplace](#request-1-texto-marketplace)
3. [Request 2: Busca Aproximada](#request-2-busca-aproximada)
4. [Request 3: Animação Logo](#request-3-animação-logo)
5. [Request 4: Lupa Header](#request-4-lupa-header)
6. [Request 5: Botões Perfil](#request-5-botões-perfil)
7. [Request 6: Clicar Usuário Chat](#request-6-clicar-usuário-chat)
8. [Request 7: Compartilhamento](#request-7-compartilhamento)
9. [Request 8: Planos de Assinatura](#request-8-planos-de-assinatura)
10. [Checklist Completo](#checklist-completo)
11. [Priorização e Cronograma](#priorização-e-cronograma)

---

## 📊 Resumo Executivo

### Status Geral

| Request | Título | Frontend | Backend | Prioridade |
|---------|--------|----------|---------|------------|
| 1 | Texto Marketplace | ✅ Completo | ✅ Nenhuma ação | - |
| 2 | Busca Aproximada | ✅ Completo | ⚠️ **ALTA** | **P0** |
| 3 | Animação Logo | ✅ Completo | ✅ Nenhuma ação | - |
| 4 | Lupa Header | ✅ Completo | ✅ Nenhuma ação | - |
| 5 | Botões Perfil | ✅ Completo | ✅ Nenhuma ação | - |
| 6 | Clicar Usuário Chat | ✅ Completo | ✅ Nenhuma ação | - |
| 7 | Compartilhamento | ✅ Parcial | ⚠️ **ALTA** | **P1** |
| 8 | Planos Assinatura | ✅ Completo | ⚠️ **CRÍTICA** | **P0** |

### Impacto Total

**Total de pendências críticas:** 3

- **7 endpoints** novos precisam ser criados
- **3 tabelas** precisam de alteração (migrations)
- **2 arquivos** de configuração no servidor web (.well-known)
- **3 plataformas** externas precisam de configuração (Apple, Google, Stripe)

---

## Request 1: Texto Marketplace

### ✅ Status: NENHUMA AÇÃO NECESSÁRIA

**Mudança realizada:**
- Alteração de texto estático no frontend (locale)
- **Antes:** "Encontre todos os tipos de produtos ou serviços que você precisa"
- **Depois:** "Encontre os produtos e serviços que você precisa"

**Backend:**
- ✅ Nenhuma ação necessária
- Esta é apenas uma mudança de texto no cliente

---

## Request 2: Busca Aproximada

### ⚠️ Status: AÇÃO NECESSÁRIA - PRIORIDADE ALTA

### Contexto

O frontend implementou busca **aproximada/genérica** usando normalização de texto (lowercase, remoção de acentos, trim). Para funcionar corretamente, o backend precisa suportar busca flexível.

### Arquivos Frontend Modificados

- `src/utils/searchHelper.ts` (novo)
- `src/pages/app/searchPosts/index.tsx`
- `src/pages/app/marketplace/index.tsx`
- `src/pages/app/chats/index.tsx`
- `src/pages/app/selectLanguage/index.tsx`

### 🔴 Ações Necessárias no Backend

#### 1. Endpoint: Buscar Posts

**URL:** `GET /api/posts`

**Query params atuais:**
- `skip`, `take` (paginação)
- `user_id` (filtro por usuário)
- `only_followers` (apenas seguidores)
- `search` (termo de busca) ← **MODIFICAR**

**Mudança necessária:**

```typescript
// ANTES (busca exata)
WHERE description = :search

// DEPOIS (busca aproximada)
WHERE LOWER(UNACCENT(description)) LIKE LOWER(UNACCENT(:search))
// Ou usar full-text search:
WHERE to_tsvector('portuguese', description) @@ plainto_tsquery('portuguese', :search)
```

**Implementação SQL (PostgreSQL):**

```sql
-- Habilitar extensão unaccent (se não estiver)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Busca aproximada em posts
SELECT * FROM posts
WHERE LOWER(UNACCENT(description)) LIKE '%' || LOWER(UNACCENT(:search)) || '%'
ORDER BY created_at DESC
LIMIT :take OFFSET :skip;
```

**Implementação SQL (MySQL):**

```sql
-- MySQL não tem UNACCENT nativo, criar função:
DELIMITER $$
CREATE FUNCTION remove_accents(str VARCHAR(255))
RETURNS VARCHAR(255) DETERMINISTIC
BEGIN
  SET str = REPLACE(str, 'á', 'a');
  SET str = REPLACE(str, 'é', 'e');
  SET str = REPLACE(str, 'í', 'i');
  SET str = REPLACE(str, 'ó', 'o');
  SET str = REPLACE(str, 'ú', 'u');
  -- ... adicionar outros acentos
  RETURN str;
END$$
DELIMITER ;

-- Busca aproximada
SELECT * FROM posts
WHERE LOWER(remove_accents(description)) LIKE CONCAT('%', LOWER(remove_accents(:search)), '%')
ORDER BY created_at DESC
LIMIT :take OFFSET :skip;
```

---

#### 2. Endpoint: Buscar Produtos

**URL:** `GET /api/products`

**Query params:**
- `skip`, `take`
- `search` ← **MODIFICAR**

**Mudança necessária:**

```sql
-- PostgreSQL
SELECT p.*, pm.uri as media, pm.type as media_type
FROM products p
LEFT JOIN product_medias pm ON pm.product_id = p.id
WHERE LOWER(UNACCENT(p.name)) LIKE '%' || LOWER(UNACCENT(:search)) || '%'
   OR LOWER(UNACCENT(p.description)) LIKE '%' || LOWER(UNACCENT(:search)) || '%'
GROUP BY p.id
ORDER BY p.created_at DESC
LIMIT :take OFFSET :skip;
```

**Buscar em múltiplos campos:**
- `name` (nome do produto)
- `description` (descrição)

---

#### 3. Endpoint: Buscar Usuários

**URL:** `GET /api/users/search`

**Query params:**
- `skip`, `take`
- `search` ← **MODIFICAR**

**Mudança necessária:**

```sql
-- PostgreSQL
SELECT u.id, u.name, u.username, u.avatar, u.bio, ut.name as user_type_name,
       EXISTS(SELECT 1 FROM user_follows WHERE follower_id = :current_user_id AND followed_id = u.id) as is_following
FROM users u
LEFT JOIN user_types ut ON ut.id = u.user_type_id
WHERE LOWER(UNACCENT(u.name)) LIKE '%' || LOWER(UNACCENT(:search)) || '%'
   OR LOWER(UNACCENT(u.username)) LIKE '%' || LOWER(UNACCENT(:search)) || '%'
ORDER BY u.name ASC
LIMIT :take OFFSET :skip;
```

**Buscar em:**
- `name` (nome do usuário)
- `username` (username/handle)

---

#### 4. Performance e Índices

**Criar índices para otimização:**

```sql
-- PostgreSQL - Índices GIN para full-text search (melhor performance)
CREATE INDEX idx_posts_description_fulltext ON posts USING GIN (to_tsvector('portuguese', description));
CREATE INDEX idx_products_name_fulltext ON products USING GIN (to_tsvector('portuguese', name));
CREATE INDEX idx_products_description_fulltext ON products USING GIN (to_tsvector('portuguese', description));
CREATE INDEX idx_users_name_fulltext ON users USING GIN (to_tsvector('portuguese', name));
CREATE INDEX idx_users_username_fulltext ON users USING GIN (to_tsvector('portuguese', username));

-- Ou índices funcionais LOWER + UNACCENT (mais simples)
CREATE INDEX idx_posts_description_lower ON posts (LOWER(UNACCENT(description)));
CREATE INDEX idx_products_name_lower ON products (LOWER(UNACCENT(name)));
CREATE INDEX idx_users_name_lower ON users (LOWER(UNACCENT(name)));
CREATE INDEX idx_users_username_lower ON users (LOWER(UNACCENT(username)));
```

---

### ✅ Checklist Backend - Request 2

- [ ] Instalar extensão `unaccent` (PostgreSQL) ou criar função (MySQL)
- [ ] Modificar endpoint `GET /api/posts` para busca aproximada
- [ ] Modificar endpoint `GET /api/products` para busca aproximada
- [ ] Modificar endpoint `GET /api/users/search` para busca aproximada
- [ ] Criar índices de performance (GIN ou funcionais)
- [ ] Testar busca com acentos ("café" encontra "cafe")
- [ ] Testar busca com uppercase/lowercase ("SILVA" encontra "silva")
- [ ] Testar busca parcial ("joao" encontra "João Silva")
- [ ] Validar performance com banco grande (>10k registros)

---

## Request 3: Animação Logo

### ✅ Status: NENHUMA AÇÃO NECESSÁRIA

**Mudança realizada:**
- Animação de splash screen implementada no frontend
- Usa `react-native-reanimated` e `react-native-linear-gradient`

**Backend:**
- ✅ Nenhuma ação necessária
- Animação é 100% client-side

---

## Request 4: Lupa Header

### ✅ Status: NENHUMA AÇÃO NECESSÁRIA

**Mudança realizada:**
- Ajuste de tamanho e cor do ícone SVG no frontend

**Backend:**
- ✅ Nenhuma ação necessária
- Mudança visual apenas

---

## Request 5: Botões Perfil

### ✅ Status: NENHUMA AÇÃO NECESSÁRIA

**Mudança realizada:**
- Ajuste de espaçamento entre botões no frontend

**Backend:**
- ✅ Nenhuma ação necessária
- Mudança de layout apenas

---

## Request 6: Clicar Usuário Chat

### ✅ Status: NENHUMA AÇÃO NECESSÁRIA

**Mudança realizada:**
- Navegação para perfil ao clicar no usuário dentro do chat

**Backend:**
- ✅ Nenhuma ação necessária
- Navegação é client-side
- Endpoint `GET /api/users/:id/profile` já existe

---

## Request 7: Compartilhamento

### ⚠️ Status: AÇÃO NECESSÁRIA - PRIORIDADE ALTA

### Contexto

O frontend implementou:
1. ✅ **Contador de compartilhamentos** (`total_shares` exibido)
2. ✅ **Preview da postagem** no modal de compartilhamento
3. ✅ **Deep linking** (configuração base)

Para funcionar completamente, o backend precisa de:
- API para registrar compartilhamentos
- API de compartilhamento interno
- Configuração de Universal Links (servidor web)

---

### 🔴 Ações Necessárias no Backend

#### 1. Banco de Dados - Tabela `post_shares`

**Criar tabela de analytics de compartilhamento:**

```sql
CREATE TABLE post_shares (
  id SERIAL PRIMARY KEY,
  post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_method VARCHAR(20) NOT NULL, -- 'whatsapp', 'others', 'internal'
  shared_with_user_id INT NULL REFERENCES users(id) ON DELETE SET NULL, -- Apenas para compartilhamento interno
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_post_shares_post_id (post_id),
  INDEX idx_post_shares_user_id (user_id),
  INDEX idx_post_shares_method (share_method),
  INDEX idx_post_shares_created_at (created_at)
);
```

**Adicionar campo `total_shares` na tabela `posts`:**

```sql
ALTER TABLE posts 
ADD COLUMN total_shares INT DEFAULT 0 COMMENT 'Contador total de compartilhamentos';

-- Criar índice para ordenação/filtro
CREATE INDEX idx_posts_total_shares ON posts(total_shares);
```

---

#### 2. Endpoint: Registrar Compartilhamento

**URL:** `POST /api/posts/:id/share`

**Autenticação:** Bearer token (usuário logado)

**Body:**
```json
{
  "share_method": "whatsapp" | "others" | "internal"
}
```

**Response (200):**
```json
{
  "success": true,
  "total_shares": 15,
  "message": "Compartilhamento registrado com sucesso"
}
```

**Response (404):**
```json
{
  "success": false,
  "message": "Post não encontrado"
}
```

**Implementação (Pseudocódigo):**

```typescript
async function registerShare(postId: number, userId: number, shareMethod: string) {
  // Validar post existe
  const post = await db.posts.findOne({ id: postId });
  if (!post) {
    throw new Error('POST_NOT_FOUND');
  }

  // Criar registro de compartilhamento
  await db.post_shares.create({
    post_id: postId,
    user_id: userId,
    share_method: shareMethod,
    created_at: new Date(),
  });

  // Incrementar contador
  const updated = await db.posts.update(postId, {
    total_shares: post.total_shares + 1,
  });

  return {
    success: true,
    total_shares: updated.total_shares,
  };
}
```

---

#### 3. Endpoint: Obter Total de Compartilhamentos

**URL:** `GET /api/posts/:id`

**Modificação necessária:**

O endpoint já retorna posts, apenas garantir que o campo `total_shares` está sendo retornado:

```typescript
// Resposta atual do GET /api/posts/:id
{
  id: 123,
  description: "...",
  total_likes: 45,
  total_comments: 12,
  total_shares: 8,  // ← GARANTIR QUE ESTÁ SENDO RETORNADO
  user_liked: true,
  created_at: "2026-01-20T10:00:00Z",
  user: { ... },
  post_medias: [ ... ]
}
```

**SQL:**

```sql
SELECT 
  p.id, 
  p.description, 
  p.total_likes, 
  p.total_comments, 
  p.total_shares,  -- ← INCLUIR
  p.created_at,
  -- ... outros campos
FROM posts p
WHERE p.id = :post_id;
```

---

#### 4. Endpoint: Compartilhamento Interno

**URL:** `POST /api/posts/:id/share/internal`

**Autenticação:** Bearer token

**Body:**
```json
{
  "user_ids": [456, 789, 101]  // IDs dos usuários para compartilhar
}
```

**Response (200):**
```json
{
  "success": true,
  "shared_with": 3,
  "total_shares": 18
}
```

**Implementação:**

```typescript
async function shareInternally(postId: number, senderId: number, recipientIds: number[]) {
  const post = await db.posts.findOne({ id: postId });
  if (!post) {
    throw new Error('POST_NOT_FOUND');
  }

  // Criar registros de compartilhamento
  for (const recipientId of recipientIds) {
    await db.post_shares.create({
      post_id: postId,
      user_id: senderId,
      share_method: 'internal',
      shared_with_user_id: recipientId,
    });

    // Criar notificação para o destinatário
    await db.notifications.create({
      user_id: recipientId,
      type: 'POST_SHARED',
      sender_id: senderId,
      post_id: postId,
      message: `{sender_name} compartilhou uma publicação com você`,
      read: false,
    });
  }

  // Incrementar contador
  const updated = await db.posts.update(postId, {
    total_shares: post.total_shares + recipientIds.length,
  });

  return {
    success: true,
    shared_with: recipientIds.length,
    total_shares: updated.total_shares,
  };
}
```

---

#### 5. Endpoint: Listar Usuários para Compartilhar

**URL:** `GET /api/users/shareable`

**Autenticação:** Bearer token

**Query params:**
- `search` (opcional) - Buscar por nome/username
- `skip`, `take` - Paginação

**Response:**
```json
{
  "total": 50,
  "records": [
    {
      "id": 456,
      "name": "Maria Santos",
      "username": "mariasantos",
      "avatar": "https://cdn.farmsilo.app/avatars/456.jpg",
      "is_following": true
    }
  ]
}
```

**Implementação:**

```sql
SELECT 
  u.id, 
  u.name, 
  u.username, 
  u.avatar,
  EXISTS(
    SELECT 1 FROM user_follows 
    WHERE follower_id = :current_user_id 
    AND followed_id = u.id
  ) as is_following
FROM users u
WHERE u.id != :current_user_id  -- Não incluir o próprio usuário
  AND (
    :search IS NULL 
    OR LOWER(UNACCENT(u.name)) LIKE '%' || LOWER(UNACCENT(:search)) || '%'
    OR LOWER(UNACCENT(u.username)) LIKE '%' || LOWER(UNACCENT(:search)) || '%'
  )
ORDER BY is_following DESC, u.name ASC
LIMIT :take OFFSET :skip;
```

---

#### 6. Endpoint: Obter Posts Compartilhados Comigo

**URL:** `GET /api/posts/shared-with-me`

**Autenticação:** Bearer token

**Query params:**
- `skip`, `take` - Paginação

**Response:**
```json
{
  "total": 15,
  "records": [
    {
      "id": 999,
      "shared_at": "2026-01-23T14:30:00Z",
      "shared_by": {
        "id": 123,
        "name": "João Silva",
        "avatar": "https://..."
      },
      "post": {
        "id": 456,
        "description": "Confira essa plantação!",
        "total_likes": 45,
        "total_comments": 12,
        "total_shares": 8,
        "user": { ... },
        "post_medias": [ ... ]
      }
    }
  ]
}
```

**Implementação:**

```sql
SELECT 
  ps.id,
  ps.created_at as shared_at,
  sender.id as shared_by_id,
  sender.name as shared_by_name,
  sender.avatar as shared_by_avatar,
  p.*
FROM post_shares ps
INNER JOIN users sender ON sender.id = ps.user_id
INNER JOIN posts p ON p.id = ps.post_id
WHERE ps.shared_with_user_id = :current_user_id
  AND ps.share_method = 'internal'
ORDER BY ps.created_at DESC
LIMIT :take OFFSET :skip;
```

---

#### 7. Configuração Deep Links - Servidor Web

**Arquivo 1:** `.well-known/apple-app-site-association`

**Localização:** `https://farmsilo.app/.well-known/apple-app-site-association`

**Content-Type:** `application/json` (importante: **sem extensão .json** no arquivo)

**Conteúdo:**

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.farmsilo",
        "paths": [
          "/post/*",
          "/product/*",
          "/profile/*"
        ]
      }
    ]
  }
}
```

**Substituir:**
- `TEAM_ID` pelo Team ID real da Apple Developer Account

**Requisitos técnicos:**
- ✅ Acessível via HTTPS (obrigatório)
- ✅ Não pode ter redirect 301/302
- ✅ Content-Type: `application/json`
- ✅ Tamanho máximo: 128 KB

**Validação:** https://search.developer.apple.com/appsearch-validation-tool

---

**Arquivo 2:** `.well-known/assetlinks.json`

**Localização:** `https://farmsilo.app/.well-known/assetlinks.json`

**Content-Type:** `application/json`

**Conteúdo:**

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.farmsilo",
    "sha256_cert_fingerprints": [
      "SHA256_FINGERPRINT_RELEASE",
      "SHA256_FINGERPRINT_DEBUG"
    ]
  }
}]
```

**Como obter SHA256 Fingerprint:**

```bash
# Release keystore
keytool -list -v -keystore android/app/release.keystore -alias release

# Debug keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Copiar o SHA256 da saída:**
```
Certificate fingerprints:
         SHA256: 14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5
```

**Validação:** https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://farmsilo.app

---

#### 8. Endpoint: Página Web de Fallback (Deep Link)

**URL:** `https://farmsilo.app/post/:id`

**Função:** Redirecionar para app ou loja

**Implementação (Node.js/Express):**

```javascript
app.get('/post/:id', (req, res) => {
  const postId = req.params.id;
  const userAgent = req.headers['user-agent'];
  
  // Detectar plataforma
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isMobile = isIOS || isAndroid;
  
  if (isMobile) {
    // Tentar abrir no app (fallback para loja após timeout)
    const deepLink = `farmsilo://post/${postId}`;
    const iosStoreLink = 'https://apps.apple.com/app/farmsilo/ID_DO_APP';
    const androidStoreLink = 'https://play.google.com/store/apps/details?id=com.farmsilo';
    
    const storeLink = isIOS ? iosStoreLink : androidStoreLink;
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Farmsilo - Post ${postId}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        <script>
          // Tentar abrir no app
          window.location = '${deepLink}';
          
          // Fallback para loja após 2 segundos
          setTimeout(function() {
            window.location = '${storeLink}';
          }, 2000);
        </script>
        <p>Abrindo no app Farmsilo...</p>
        <p>Se não abrir, <a href="${storeLink}">clique aqui para baixar</a></p>
      </body>
      </html>
    `);
  } else {
    // Desktop: mostrar preview do post
    res.redirect(`https://farmsilo.app/web/post/${postId}`);
  }
});
```

---

### ✅ Checklist Backend - Request 7

**Banco de Dados:**
- [ ] Criar tabela `post_shares`
- [ ] Adicionar campo `total_shares` na tabela `posts`
- [ ] Criar índices de performance

**Endpoints:**
- [ ] `POST /api/posts/:id/share` - Registrar compartilhamento
- [ ] `GET /api/posts/:id` - Garantir que retorna `total_shares`
- [ ] `POST /api/posts/:id/share/internal` - Compartilhamento interno
- [ ] `GET /api/users/shareable` - Listar usuários para compartilhar
- [ ] `GET /api/posts/shared-with-me` - Posts compartilhados comigo

**Servidor Web:**
- [ ] Criar arquivo `.well-known/apple-app-site-association`
- [ ] Criar arquivo `.well-known/assetlinks.json`
- [ ] Configurar rota `GET /post/:id` (fallback web)
- [ ] Configurar rota `GET /product/:id` (fallback web)
- [ ] Configurar rota `GET /profile/:userId` (fallback web)

**Validação:**
- [ ] Testar deep link no iOS (Universal Link)
- [ ] Testar deep link no Android (App Link)
- [ ] Validar arquivo Apple (https://search.developer.apple.com/appsearch-validation-tool)
- [ ] Validar arquivo Android (https://digitalassetlinks.googleapis.com)
- [ ] Testar compartilhamento WhatsApp (contador incrementa)
- [ ] Testar compartilhamento interno (notificação criada)

---

## Request 8: Planos de Assinatura

### ⚠️ Status: AÇÃO NECESSÁRIA - PRIORIDADE CRÍTICA

### Contexto

O frontend implementou:
- ✅ Novas descrições de planos no `PlanCard`
- ✅ Renderização dinâmica de features baseado no nome do plano

**Mudanças nos planos:**

| Plano | Preço Antes | Preço Depois | Novidades |
|-------|-------------|--------------|-----------|
| Free | R$ 0,00 | R$ 0,00 | **Limite total:** 3 anúncios criados (ao tentar 4º, exige upgrade) |
| Pro | R$ 14,90 | **R$ 24,90** | **Cooldown:** Editar a cada 6 meses<br>**Limite total:** 10 anúncios criados |
| Premium | R$ 24,90 | **R$ 39,90** | **Edição ilimitada:** Alterar anúncios sempre que quiser |

---

### 🔴 Ações Necessárias no Backend

#### 1. Banco de Dados - Migrations

**Migration 1: Adicionar campos na tabela `plans`**

```sql
ALTER TABLE plans 
ADD COLUMN edit_cooldown_months INT DEFAULT 0 COMMENT 'Meses de cooldown para edição (0 = sem restrição)',
ADD COLUMN max_total_products_created INT DEFAULT 9999 COMMENT 'Limite total de produtos que podem ser criados (9999 = ilimitado)',
ADD COLUMN can_edit_anytime BOOLEAN DEFAULT FALSE COMMENT 'Se pode editar anúncios sem cooldown';

-- Atualizar planos existentes
UPDATE plans 
SET 
  edit_cooldown_months = 0,
  max_total_products_created = 3,
  can_edit_anytime = FALSE
WHERE name = 'Free';

UPDATE plans 
SET 
  edit_cooldown_months = 6,
  max_total_products_created = 10,
  can_edit_anytime = FALSE
WHERE name = 'Pro';

UPDATE plans 
SET 
  edit_cooldown_months = 0,
  max_total_products_created = 9999,
  can_edit_anytime = TRUE
WHERE name = 'Premium';

-- Atualizar preços (valores em centavos ou decimais, dependendo do sistema)
UPDATE plans SET value = '24.90' WHERE name = 'Pro';
UPDATE plans SET value = '39.90' WHERE name = 'Premium';
```

**Migration 2: Adicionar campos na tabela `users`**

```sql
ALTER TABLE users 
ADD COLUMN total_products_created INT DEFAULT 0 COMMENT 'Contador total de produtos criados (não decrementa ao deletar)',
ADD COLUMN active_products_count INT DEFAULT 0 COMMENT 'Produtos ativos no momento (decrementa ao deletar)';

-- Criar índices
CREATE INDEX idx_users_total_products ON users(total_products_created);
CREATE INDEX idx_users_active_products ON users(active_products_count);

-- Popular dados existentes (IMPORTANTE: rodar apenas uma vez)
UPDATE users u
SET 
  total_products_created = (SELECT COUNT(*) FROM products WHERE user_id = u.id),
  active_products_count = (SELECT COUNT(*) FROM products WHERE user_id = u.id AND deleted_at IS NULL);
```

**Migration 3: Adicionar campo na tabela `products`**

```sql
ALTER TABLE products 
ADD COLUMN last_edit_date TIMESTAMP NULL COMMENT 'Data da última edição do produto (para controle de cooldown)';

-- Criar índice para queries de validação
CREATE INDEX idx_products_last_edit_date ON products(last_edit_date);

-- Inicializar com data de criação para produtos existentes
UPDATE products 
SET last_edit_date = created_at 
WHERE last_edit_date IS NULL;
```

---

#### 2. Endpoint: Criar Produto (com validações)

**URL:** `POST /api/products`

**Autenticação:** Bearer token

**Body:**
```json
{
  "name": "Trator John Deere",
  "description": "Trator em ótimo estado...",
  "link": "https://exemplo.com",
  "value": "150000.00",
  "files": [...]
}
```

**Validações necessárias:**

```typescript
async function createProduct(userId: number, productData: any) {
  // 1. Buscar usuário com plano
  const user = await db.query(`
    SELECT 
      u.id, 
      u.total_products_created, 
      u.active_products_count,
      p.max_marketplace_items,
      p.max_total_products_created,
      p.name as plan_name
    FROM users u
    INNER JOIN plans p ON p.id = u.plan_id
    WHERE u.id = ?
  `, [userId]);

  if (!user) {
    throw { code: 'USER_NOT_FOUND', message: 'Usuário não encontrado' };
  }

  // 2. VALIDAÇÃO: Limite de produtos ATIVOS
  if (user.active_products_count >= user.max_marketplace_items && user.max_marketplace_items !== 9999) {
    throw {
      code: 'LIMIT_ACTIVE_PRODUCTS',
      message: `Você atingiu o limite de ${user.max_marketplace_items} anúncios ativos no plano ${user.plan_name}.`,
      limit: user.max_marketplace_items,
      current: user.active_products_count,
      requires_upgrade: true,
    };
  }

  // 3. VALIDAÇÃO: Limite de produtos CRIADOS (total)
  if (user.total_products_created >= user.max_total_products_created && user.max_total_products_created !== 9999) {
    throw {
      code: 'LIMIT_TOTAL_CREATED',
      message: `Você atingiu o limite de ${user.max_total_products_created} anúncios criados no plano ${user.plan_name}. Faça upgrade para continuar.`,
      limit: user.max_total_products_created,
      current: user.total_products_created,
      requires_upgrade: true,
    };
  }

  // 4. Criar produto
  const product = await db.products.create({
    user_id: userId,
    name: productData.name,
    description: productData.description,
    link: productData.link,
    value: productData.value,
    created_at: new Date(),
    last_edit_date: new Date(), // Inicializa com data de criação
  });

  // 5. Salvar mídias (files)
  for (const file of productData.files) {
    await db.product_medias.create({
      product_id: product.id,
      type: file.type, // 1 = imagem, 2 = vídeo
      uri: file.uri,
    });
  }

  // 6. Incrementar contadores do usuário
  await db.users.update(userId, {
    total_products_created: user.total_products_created + 1,
    active_products_count: user.active_products_count + 1,
  });

  return product;
}
```

**Response (201 - Sucesso):**
```json
{
  "id": 789,
  "name": "Trator John Deere",
  "description": "...",
  "created_at": "2026-01-23T15:00:00Z"
}
```

**Response (400 - Limite atingido):**
```json
{
  "code": "LIMIT_TOTAL_CREATED",
  "message": "Você atingiu o limite de 3 anúncios criados no plano Free. Faça upgrade para continuar.",
  "limit": 3,
  "current": 3,
  "requires_upgrade": true
}
```

---

#### 3. Endpoint: Editar Produto (com validação de cooldown)

**URL:** `PUT /api/products/:id`

**Autenticação:** Bearer token

**Body:**
```json
{
  "name": "Trator John Deere (Atualizado)",
  "description": "Nova descrição...",
  "link": "https://exemplo.com",
  "value": "140000.00"
}
```

**Validações necessárias:**

```typescript
async function updateProduct(userId: number, productId: number, productData: any) {
  // 1. Buscar produto e verificar se pertence ao usuário
  const product = await db.products.findOne({
    id: productId,
    user_id: userId,
  });

  if (!product) {
    throw { code: 'PRODUCT_NOT_FOUND', message: 'Produto não encontrado' };
  }

  // 2. Buscar plano do usuário
  const user = await db.query(`
    SELECT 
      u.id,
      p.edit_cooldown_months,
      p.can_edit_anytime,
      p.name as plan_name
    FROM users u
    INNER JOIN plans p ON p.id = u.plan_id
    WHERE u.id = ?
  `, [userId]);

  // 3. VALIDAÇÃO: Cooldown de edição
  if (!user.can_edit_anytime && user.edit_cooldown_months > 0) {
    const lastEditDate = product.last_edit_date ? new Date(product.last_edit_date) : null;

    if (lastEditDate) {
      const now = new Date();
      const nextAllowedEdit = new Date(lastEditDate);
      nextAllowedEdit.setMonth(nextAllowedEdit.getMonth() + user.edit_cooldown_months);

      if (now < nextAllowedEdit) {
        const daysRemaining = Math.ceil((nextAllowedEdit - now) / (1000 * 60 * 60 * 24));
        
        throw {
          code: 'EDIT_COOLDOWN',
          message: `Você só pode editar este anúncio a cada ${user.edit_cooldown_months} meses. Próxima edição permitida em ${nextAllowedEdit.toLocaleDateString('pt-BR')}.`,
          next_edit_date: nextAllowedEdit.toISOString(),
          days_remaining: daysRemaining,
          cooldown_months: user.edit_cooldown_months,
        };
      }
    }
  }

  // 4. Atualizar produto
  const updated = await db.products.update(productId, {
    name: productData.name,
    description: productData.description,
    link: productData.link,
    value: productData.value,
    last_edit_date: new Date(), // Atualiza data de edição
    updated_at: new Date(),
  });

  return updated;
}
```

**Response (200 - Sucesso):**
```json
{
  "id": 789,
  "name": "Trator John Deere (Atualizado)",
  "last_edit_date": "2026-01-23T15:30:00Z",
  "updated_at": "2026-01-23T15:30:00Z"
}
```

**Response (403 - Cooldown ativo):**
```json
{
  "code": "EDIT_COOLDOWN",
  "message": "Você só pode editar este anúncio a cada 6 meses. Próxima edição permitida em 23/07/2026.",
  "next_edit_date": "2026-07-23T15:00:00Z",
  "days_remaining": 181,
  "cooldown_months": 6
}
```

---

#### 4. Endpoint: Deletar Produto (com atualização de contadores)

**URL:** `DELETE /api/products/:id`

**Autenticação:** Bearer token

**Validações necessárias:**

```typescript
async function deleteProduct(userId: number, productId: number) {
  // 1. Buscar produto
  const product = await db.products.findOne({
    id: productId,
    user_id: userId,
  });

  if (!product) {
    throw { code: 'PRODUCT_NOT_FOUND', message: 'Produto não encontrado' };
  }

  // 2. Deletar produto (soft delete ou hard delete)
  await db.products.delete(productId);
  // Ou soft delete:
  // await db.products.update(productId, { deleted_at: new Date() });

  // 3. Decrementar contador de produtos ATIVOS
  await db.query(`
    UPDATE users 
    SET active_products_count = active_products_count - 1
    WHERE id = ?
  `, [userId]);

  // IMPORTANTE: NÃO decrementar total_products_created
  // (é um contador cumulativo, nunca diminui)

  return { success: true };
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Produto deletado com sucesso"
}
```

---

#### 5. Endpoint: Dados do Usuário (GET /api/users/me)

**Modificação necessária:**

Retornar novos campos do plano e contadores:

```typescript
async function getMe(userId: number) {
  const user = await db.query(`
    SELECT 
      u.id,
      u.name,
      u.email,
      u.phone,
      u.avatar,
      u.bio,
      u.pv,
      u.total_products_created,   -- NOVO
      u.active_products_count,    -- NOVO
      ut.name as user_type_name,
      p.id as plan_id,
      p.name as plan_name,
      p.value as plan_value,
      p.max_marketplace_items,
      p.max_marketplace_updates,  -- Depreciar eventualmente
      p.edit_cooldown_months,     -- NOVO
      p.max_total_products_created, -- NOVO
      p.can_edit_anytime          -- NOVO
    FROM users u
    LEFT JOIN user_types ut ON ut.id = u.user_type_id
    INNER JOIN plans p ON p.id = u.plan_id
    WHERE u.id = ?
  `, [userId]);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    bio: user.bio,
    pv: user.pv,
    total_products_created: user.total_products_created,     // NOVO
    active_products_count: user.active_products_count,       // NOVO
    user_type: {
      name: user.user_type_name,
    },
    plan: {
      id: user.plan_id,
      name: user.plan_name,
      value: user.plan_value,
      max_marketplace_items: user.max_marketplace_items,
      max_marketplace_updates: user.max_marketplace_updates,
      edit_cooldown_months: user.edit_cooldown_months,       // NOVO
      max_total_products_created: user.max_total_products_created, // NOVO
      can_edit_anytime: user.can_edit_anytime,               // NOVO
    },
  };
}
```

**Response:**
```json
{
  "id": 123,
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "phone": "+5511999999999",
  "avatar": "https://...",
  "bio": "Agricultor há 20 anos",
  "pv": 1500,
  "total_products_created": 5,
  "active_products_count": 3,
  "user_type": {
    "name": "Produtor Rural"
  },
  "plan": {
    "id": 2,
    "name": "Pro",
    "value": "24.90",
    "max_marketplace_items": 10,
    "max_marketplace_updates": 0,
    "edit_cooldown_months": 6,
    "max_total_products_created": 10,
    "can_edit_anytime": false
  }
}
```

---

#### 6. Endpoint: Listar Planos (GET /api/plans)

**Modificação necessária:**

Retornar novos campos:

```typescript
async function getPlans() {
  const plans = await db.plans.findAll({
    order: [['value', 'ASC']],
  });

  return plans.map(plan => ({
    id: plan.id,
    name: plan.name,
    apple_id: plan.apple_id,
    value: plan.value,
    max_marketplace_items: plan.max_marketplace_items,
    max_marketplace_updates: plan.max_marketplace_updates, // Depreciar
    edit_cooldown_months: plan.edit_cooldown_months,       // NOVO
    max_total_products_created: plan.max_total_products_created, // NOVO
    can_edit_anytime: plan.can_edit_anytime,               // NOVO
    created_at: plan.created_at,
    updated_at: plan.updated_at,
  }));
}
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Free",
    "apple_id": "farmsilo.free.monthly",
    "value": "0.00",
    "max_marketplace_items": 3,
    "max_marketplace_updates": 0,
    "edit_cooldown_months": 0,
    "max_total_products_created": 3,
    "can_edit_anytime": false,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2026-01-23T00:00:00Z"
  },
  {
    "id": 2,
    "name": "Pro",
    "apple_id": "farmsilo.pro.monthly",
    "value": "24.90",
    "max_marketplace_items": 10,
    "max_marketplace_updates": 0,
    "edit_cooldown_months": 6,
    "max_total_products_created": 10,
    "can_edit_anytime": false,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2026-01-23T00:00:00Z"
  },
  {
    "id": 3,
    "name": "Premium",
    "apple_id": "farmsilo.premium.monthly",
    "value": "39.90",
    "max_marketplace_items": 9999,
    "max_marketplace_updates": 0,
    "edit_cooldown_months": 0,
    "max_total_products_created": 9999,
    "can_edit_anytime": true,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2026-01-23T00:00:00Z"
  }
]
```

---

### ✅ Checklist Backend - Request 8

**Banco de Dados:**
- [ ] Migration 1: Adicionar campos na tabela `plans`
- [ ] Migration 2: Adicionar campos na tabela `users`
- [ ] Migration 3: Adicionar campo na tabela `products`
- [ ] Atualizar valores dos planos (Pro: R$ 24,90, Premium: R$ 39,90)
- [ ] Popular dados existentes (`total_products_created`, `active_products_count`)
- [ ] Criar índices de performance

**Endpoints:**
- [ ] `POST /api/products` - Adicionar validações de limites
- [ ] `PUT /api/products/:id` - Adicionar validação de cooldown
- [ ] `DELETE /api/products/:id` - Atualizar contador `active_products_count`
- [ ] `GET /api/users/me` - Retornar novos campos
- [ ] `GET /api/plans` - Retornar novos campos

**Tratamento de Erros:**
- [ ] Criar códigos de erro padronizados (`LIMIT_ACTIVE_PRODUCTS`, `LIMIT_TOTAL_CREATED`, `EDIT_COOLDOWN`)
- [ ] Retornar mensagens amigáveis em português
- [ ] Incluir metadados (limite, atual, próxima data permitida)

**Testes:**
- [ ] Testar criação de produto no limite (Free: 3, Pro: 10)
- [ ] Testar bloqueio ao tentar criar o 4º produto (Free)
- [ ] Testar bloqueio ao tentar criar o 11º produto (Pro)
- [ ] Testar edição antes do cooldown (Pro: 6 meses)
- [ ] Testar edição ilimitada (Premium)
- [ ] Testar deleção e decremento de contador
- [ ] Testar upgrade de plano e liberação de limites

**Comunicação com Usuários:**
- [ ] Email marketing informando mudanças (30 dias antes)
- [ ] Notificação in-app sobre novos preços
- [ ] FAQ sobre novos limites e regras

---

### 🍎 Configurações Apple App Store Connect

**Passo a passo:**

1. **Login:** https://appstoreconnect.apple.com
2. **Navegar:** My Apps → Farmsilo → Features → In-App Purchases
3. **Editar produto "Pro":**
   - Clicar em `farmsilo.pro.monthly`
   - Ir para "Pricing and Availability"
   - Atualizar preço: **BRL 24,90**
   - Salvar
4. **Editar produto "Premium":**
   - Clicar em `farmsilo.premium.monthly`
   - Ir para "Pricing and Availability"
   - Atualizar preço: **BRL 39,90**
   - Salvar
5. **Revisar descrições:**
   - Atualizar descrições para mencionar novos benefícios
   - Pro: "Troque seus anúncios a cada 6 meses"
   - Premium: "Altere seus anúncios sempre que quiser"
6. **Submeter para revisão:**
   - Se necessário, criar nova versão do app (1.x.x → 1.y.0)
   - Submeter para revisão (aguardar 1-3 dias)

---

### 🤖 Configurações Google Play Console

**Passo a passo:**

1. **Login:** https://play.google.com/console
2. **Navegar:** Apps → Farmsilo → Monetize → Products → Subscriptions
3. **Editar "Pro":**
   - Clicar em `farmsilo.pro.monthly`
   - Ir para "Pricing"
   - Clicar em "Edit price" (Brasil)
   - Alterar para **R$ 24,90**
   - Salvar
4. **Editar "Premium":**
   - Clicar em `farmsilo.premium.monthly`
   - Ir para "Pricing"
   - Clicar em "Edit price" (Brasil)
   - Alterar para **R$ 39,90**
   - Salvar
5. **Atualizar descrições:**
   - Adicionar novos benefícios nas descrições
6. **Publicar mudanças:**
   - Mudanças de preço entram em vigor imediatamente ou após período de aviso (30 dias)

**Importante:**
- Google Play pode exigir notificação aos usuários atuais com **30 dias de antecedência**
- Usuários podem cancelar antes da mudança de preço

---

### 💳 Configurações Stripe Dashboard

**Passo a passo:**

1. **Login:** https://dashboard.stripe.com
2. **Navegar:** Products → Subscriptions
3. **Criar novo "Price" para Pro:**
   - Clicar no produto "Pro" existente
   - Clicar em "Add another price"
   - **Preço:** BRL 24,90
   - **Recorrência:** Mensal
   - Salvar e copiar `price_id` (ex: `price_ABC123`)
4. **Criar novo "Price" para Premium:**
   - Clicar no produto "Premium" existente
   - Clicar em "Add another price"
   - **Preço:** BRL 39,90
   - **Recorrência:** Mensal
   - Salvar e copiar `price_id` (ex: `price_XYZ789`)
5. **Atualizar código backend:**
   - Atualizar mapeamento de planos para usar novos `price_id`
   - Manter `price_id` antigos para usuários existentes
6. **Migração de assinaturas existentes:**
   - **Opção 1 (grandfathering):** Usuários atuais mantêm preço antigo
   - **Opção 2 (migração forçada):** Usar Stripe API para atualizar `price_id` de assinaturas ativas (exige aviso de 30 dias)

**Código de migração (Stripe API):**

```javascript
const stripe = require('stripe')('sk_live_...');

// Migrar assinatura de usuário
async function migratePlan(subscriptionId, newPriceId) {
  const subscription = await stripe.subscriptions.update(
    subscriptionId,
    {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations', // Pro-rata o valor
    }
  );
  
  return subscription;
}
```

---

## 📋 Checklist Completo

### Backend - Banco de Dados

- [ ] **Request 2:** Instalar extensão `unaccent` (PostgreSQL)
- [ ] **Request 2:** Criar índices fulltext/LOWER para busca aproximada
- [ ] **Request 7:** Criar tabela `post_shares`
- [ ] **Request 7:** Adicionar campo `total_shares` na tabela `posts`
- [ ] **Request 8:** Adicionar campos na tabela `plans` (edit_cooldown_months, max_total_products_created, can_edit_anytime)
- [ ] **Request 8:** Adicionar campos na tabela `users` (total_products_created, active_products_count)
- [ ] **Request 8:** Adicionar campo na tabela `products` (last_edit_date)
- [ ] **Request 8:** Atualizar preços dos planos (Pro: 24.90, Premium: 39.90)
- [ ] **Request 8:** Popular dados existentes (contadores de produtos)

### Backend - Endpoints

**Request 2 - Busca Aproximada:**
- [ ] `GET /api/posts` - Modificar para busca aproximada
- [ ] `GET /api/products` - Modificar para busca aproximada
- [ ] `GET /api/users/search` - Modificar para busca aproximada

**Request 7 - Compartilhamento:**
- [ ] `POST /api/posts/:id/share` - Registrar compartilhamento
- [ ] `GET /api/posts/:id` - Garantir retorno de `total_shares`
- [ ] `POST /api/posts/:id/share/internal` - Compartilhamento interno
- [ ] `GET /api/users/shareable` - Listar usuários para compartilhar
- [ ] `GET /api/posts/shared-with-me` - Posts compartilhados comigo

**Request 8 - Planos:**
- [ ] `POST /api/products` - Adicionar validações de limites
- [ ] `PUT /api/products/:id` - Adicionar validação de cooldown
- [ ] `DELETE /api/products/:id` - Atualizar contador de produtos ativos
- [ ] `GET /api/users/me` - Retornar novos campos (contadores e plano)
- [ ] `GET /api/plans` - Retornar novos campos (edit_cooldown_months, etc)

### Backend - Servidor Web

**Request 7 - Deep Links:**
- [ ] Criar arquivo `.well-known/apple-app-site-association`
- [ ] Criar arquivo `.well-known/assetlinks.json`
- [ ] Implementar rota `GET /post/:id` (fallback web)
- [ ] Implementar rota `GET /product/:id` (fallback web)
- [ ] Implementar rota `GET /profile/:userId` (fallback web)

### Plataformas Externas

**Apple App Store Connect:**
- [ ] Atualizar preço do plano Pro (R$ 14,90 → R$ 24,90)
- [ ] Atualizar preço do plano Premium (R$ 24,90 → R$ 39,90)
- [ ] Atualizar descrições dos produtos In-App Purchase
- [ ] Submeter para revisão (aguardar 1-3 dias)

**Google Play Console:**
- [ ] Atualizar preço do plano Pro (R$ 24,90)
- [ ] Atualizar preço do plano Premium (R$ 39,90)
- [ ] Atualizar descrições dos produtos de assinatura

**Stripe Dashboard:**
- [ ] Criar novo "Price" para Pro (BRL 24.90)
- [ ] Criar novo "Price" para Premium (BRL 39.90)
- [ ] Atualizar código backend com novos `price_id`
- [ ] Decidir estratégia de migração (grandfathering vs. migração forçada)

### Testes

**Request 2 - Busca:**
- [ ] Buscar "cafe" encontra "café"
- [ ] Buscar "SILVA" encontra "silva"
- [ ] Buscar "joao" encontra "João Silva"
- [ ] Validar performance (>10k registros)

**Request 7 - Compartilhamento:**
- [ ] Compartilhar no WhatsApp incrementa contador
- [ ] Compartilhamento interno cria notificação
- [ ] Deep link abre app (iOS)
- [ ] Deep link abre app (Android)
- [ ] Fallback para loja funciona

**Request 8 - Planos:**
- [ ] Free: Bloqueio no 4º produto
- [ ] Pro: Bloqueio no 11º produto
- [ ] Pro: Bloqueio de edição antes de 6 meses
- [ ] Premium: Edição ilimitada
- [ ] Deleção decrementa `active_products_count`
- [ ] Upgrade de plano libera limites

### Comunicação

- [ ] Email marketing (30 dias antes da mudança de preços)
- [ ] Notificação in-app sobre novos planos
- [ ] FAQ sobre novos limites
- [ ] Anúncio em redes sociais

---

## ⏱️ Priorização e Cronograma

### Prioridade P0 - CRÍTICA (Implementar IMEDIATAMENTE)

**Request 8 - Planos de Assinatura**
- **Prazo:** 5 dias úteis
- **Razão:** Impacta receita, precisa de aprovação Apple (1-3 dias)
- **Tarefas:**
  1. Migrations (1 dia)
  2. Endpoints com validações (2 dias)
  3. Testes (1 dia)
  4. Deploy + Configurações IAP (1 dia)

**Request 2 - Busca Aproximada**
- **Prazo:** 3 dias úteis
- **Razão:** Afeta UX diretamente, usuários já esperando funcionalidade
- **Tarefas:**
  1. Extensão/Função unaccent (0.5 dia)
  2. Modificar 3 endpoints (1 dia)
  3. Criar índices (0.5 dia)
  4. Testes (1 dia)

---

### Prioridade P1 - ALTA (Implementar em até 2 semanas)

**Request 7 - Compartilhamento**
- **Prazo:** 7 dias úteis
- **Razão:** Aumenta engajamento, mas não bloqueia funcionalidades atuais
- **Tarefas:**
  1. Tabela `post_shares` + campo `total_shares` (1 dia)
  2. Endpoints de compartilhamento (2 dias)
  3. Configuração deep links (servidor web) (1 dia)
  4. Testes (2 dias)
  5. Validação Apple/Android (1 dia)

---

### Prioridade P2 - MÉDIA (Pode aguardar)

**Requests 1, 3, 4, 5, 6**
- **Prazo:** Nenhuma ação necessária
- **Razão:** Frontend-only

---

## 📞 Contato e Suporte

Para dúvidas sobre esta documentação, entre em contato com o desenvolvedor frontend ou abra uma issue no repositório.

**Documento gerado automaticamente em:** 2026-01-23  
**Versão:** 1.0
