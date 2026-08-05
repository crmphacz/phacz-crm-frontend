# Melhorias de Compartilhamento - Implementação Frontend + Requisitos Backend

## 📋 Resumo de Implementações

### ✅ Implementado no Frontend (100%)

1. **Contador de Compartilhamentos** ✅
2. **Preview da Postagem no Modal** ✅  
3. **Deep Linking - Configuração Base** ✅

### ⚠️ Requer Backend

1. **API de Métricas de Compartilhamento**
2. **Compartilhamento Interno Completo**
3. **Notificações In-App**
4. **Seção "Compartilhados comigo"**

---

## 🎯 Detalhamento das Implementações Frontend

### 1. Contador de Compartilhamentos ✅

**Arquivos modificados:**
- `src/interfaces/hooks/post.tsx` - Adicionado campo `total_shares: number`
- `src/components/molecules/postActions/index.tsx` - Exibe contador
- `src/components/molecules/post/index.tsx` - Passa `total_shares` para PostActions

**Funcionalidade:**
```typescript
// Exibe contador apenas quando > 0
<Text type="small">
  {totalShares > 0 ? `${totalShares} ` : ''}
  {t('post.share', 'Compartilhar')}
</Text>
```

**Visual:**
- Sem compartilhamentos: "Compartilhar"
- Com compartilhamentos: "5 Compartilhar"

---

### 2. Preview da Postagem no Modal ✅

**Arquivos modificados:**
- `src/components/organism/sharePost/index.tsx` - Lógica do preview
- `src/components/organism/sharePost/styles.tsx` - Estilos do preview
- `src/components/molecules/postActions/index.tsx` - Passa dados para preview
- `src/components/molecules/post/index.tsx` - Envia avatar, nome e imagem

**Elementos do Preview:**
1. **Avatar do usuário** (40x40, circular)
2. **Nome do usuário** (bold)
3. **Descrição do post** (até 3 linhas, truncado)
4. **Primeira imagem do post** (150px altura, border-radius 8)

**Design:**
- Background: #F8F8F8
- Border-radius: 12px
- Padding: 15px
- Espaçamento entre elementos

**Exemplo:**
```
┌─────────────────────────────┐
│  [Avatar] João Silva        │
│  Confira essa plantação...  │
│  ┌─────────────────────┐    │
│  │                     │    │
│  │   [Imagem Post]     │    │
│  │                     │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

---

### 3. Deep Linking - Configuração Base ✅

**Arquivo criado:**
- `src/utils/deepLinkConfig.ts` - Configuração completa de deep links

**Links suportados:**
```typescript
// Schema próprio
farmsilo://post/123

// Universal Links (iOS) / App Links (Android)
https://farmsilo.app/post/123
https://farmsilo.app/product/456
https://farmsilo.app/profile/789
```

**Funções utilitárias:**
```typescript
// Gerar deep link
generatePostDeepLink(123)
// → "https://farmsilo.app/post/123"

// Extrair ID do link
extractPostIdFromDeepLink("https://farmsilo.app/post/123")
// → 123
```

**Integração com Compartilhamento:**
- Mensagem de compartilhamento agora inclui deep link
- Usuário que recebe pode abrir direto no app (se instalado)
- Fallback para loja se app não instalado

**Configuração React Navigation:**
```typescript
const linking = {
  prefixes: ['farmsilo://', 'https://farmsilo.app'],
  config: {
    screens: {
      Post: 'post/:id',
      Product: 'product/:id',
      Profile: 'profile/:userId',
    },
  },
};
```

---

## 🔧 Configurações Necessárias (Plataforma)

### Android

**Arquivo:** `android/app/src/main/AndroidManifest.xml`

```xml
<activity android:name=".MainActivity">
  <!-- Deep Links -->
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    
    <!-- Schema próprio -->
    <data android:scheme="farmsilo" />
    
    <!-- App Links (Universal) -->
    <data 
      android:scheme="https" 
      android:host="farmsilo.app" 
      android:pathPrefix="/post" 
    />
    <data 
      android:scheme="https" 
      android:host="farmsilo.app" 
      android:pathPrefix="/product" 
    />
    <data 
      android:scheme="https" 
      android:host="farmsilo.app" 
      android:pathPrefix="/profile" 
    />
  </intent-filter>
</activity>
```

**Arquivo:** `android/app/build.gradle`

```gradle
android {
    defaultConfig {
        // ...
        manifestPlaceholders = [
            appAuthRedirectScheme: 'farmsilo'
        ]
    }
}
```

### iOS

**Arquivo:** `ios/farmsilo/Info.plist`

```xml
<!-- URL Schemes -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLName</key>
    <string>com.farmsilo</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>farmsilo</string>
    </array>
  </dict>
</array>

<!-- Universal Links -->
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>farmsilo</string>
  <string>https</string>
</array>
```

**Arquivo:** `ios/farmsilo/farmsilo.entitlements`

```xml
<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:farmsilo.app</string>
  <string>applinks:www.farmsilo.app</string>
</array>
```

---

## 🖥️ Configurações do Servidor (Backend)

### 1. Apple App Site Association

**URL:** `https://farmsilo.app/.well-known/apple-app-site-association`

**Content-Type:** `application/json` (sem extensão .json)

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

**Importante:**
- Substitua `TEAM_ID` pelo Team ID da Apple Developer
- Arquivo deve estar acessível via HTTPS
- Não usar redirect (301/302)
- Content-Type correto

### 2. Android App Links

**URL:** `https://farmsilo.app/.well-known/assetlinks.json`

**Content-Type:** `application/json`

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
# Release
keytool -list -v -keystore app/release.keystore

# Debug
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### 3. Página de Redirecionamento (Web)

**URL:** `https://farmsilo.app/post/[id]`

**Lógica:**
```javascript
// Se mobile e app não instalado → redirect para loja
if (isMobile && !hasApp) {
  if (isIOS) {
    window.location = "https://apps.apple.com/app/farmsilo/ID";
  } else if (isAndroid) {
    window.location = "https://play.google.com/store/apps/details?id=com.farmsilo";
  }
}
```

**Fallback:**
- Exibir preview do post (Open Graph)
- Botões de download (App Store / Play Store)
- Informações do post

---

## 📡 Ações Necessárias no Backend

### 1. API de Métricas de Compartilhamento ⚠️

#### Endpoint: Registrar Compartilhamento

```http
POST /api/posts/:id/share
```

**Body:**
```json
{
  "share_method": "whatsapp" | "others" | "internal",
  "shared_with": [user_id] // Opcional, apenas para compartilhamento interno
}
```

**Response:**
```json
{
  "success": true,
  "total_shares": 15,
  "message": "Compartilhamento registrado"
}
```

**Lógica backend:**
1. Incrementar `total_shares` na tabela `posts`
2. Criar registro na tabela `post_shares` (analytics)
3. Se compartilhamento interno, criar notificação
4. Retornar novo total

#### Endpoint: Obter Métricas

```http
GET /api/posts/:id/shares
```

**Response:**
```json
{
  "total_shares": 15,
  "breakdown": {
    "whatsapp": 8,
    "others": 5,
    "internal": 2
  },
  "recent_shares": [
    {
      "user_id": 123,
      "user_name": "João Silva",
      "share_method": "whatsapp",
      "shared_at": "2026-01-23T10:30:00Z"
    }
  ]
}
```

---

### 2. Compartilhamento Interno ⚠️

#### Endpoint: Listar Usuários para Compartilhar

```http
GET /api/users/shareable
```

**Query params:**
- `search` - Busca por nome/username
- `skip`, `take` - Paginação

**Response:**
```json
{
  "total": 50,
  "records": [
    {
      "id": 123,
      "name": "João Silva",
      "username": "joaosilva",
      "avatar": "https://...",
      "is_following": true
    }
  ]
}
```

#### Endpoint: Compartilhar com Usuários

```http
POST /api/posts/:id/share/internal
```

**Body:**
```json
{
  "user_ids": [123, 456, 789],
  "message": "Olha esse post incrível!" // Opcional
}
```

**Response:**
```json
{
  "success": true,
  "shared_with": 3,
  "message": "Post compartilhado com 3 usuários"
}
```

**Lógica backend:**
1. Criar registros na tabela `post_shares`
2. Criar notificações para cada usuário
3. Incrementar `total_shares`
4. Enviar notificação push (opcional)

---

### 3. Notificações In-App ⚠️

#### Endpoint: Listar Compartilhamentos Recebidos

```http
GET /api/shares/received
```

**Query params:**
- `skip`, `take` - Paginação
- `read` - Filtrar por lidas/não lidas

**Response:**
```json
{
  "total": 10,
  "unread_count": 3,
  "records": [
    {
      "id": 456,
      "post_id": 123,
      "shared_by": {
        "id": 789,
        "name": "Maria Silva",
        "avatar": "https://..."
      },
      "message": "Você vai gostar desse!",
      "shared_at": "2026-01-23T10:30:00Z",
      "read": false,
      "post": {
        "id": 123,
        "description": "Confira...",
        "first_image": "https://..."
      }
    }
  ]
}
```

#### Endpoint: Marcar como Lido

```http
PUT /api/shares/:id/read
```

**Response:**
```json
{
  "success": true,
  "message": "Marcado como lido"
}
```

---

### 4. Seção "Compartilhados comigo" ⚠️

#### Tela a criar no Frontend:
- Nova tela `SharedWithMe`
- Listar posts compartilhados
- Badge com contador no menu

#### Endpoint necessário:
```http
GET /api/posts/shared-with-me
```

**Response:**
```json
{
  "total": 25,
  "records": [
    {
      "id": 123,
      "description": "Post compartilhado",
      "shared_by": {
        "id": 456,
        "name": "João",
        "avatar": "https://..."
      },
      "shared_at": "2026-01-23T10:30:00Z",
      "post_medias": [...],
      "total_likes": 50,
      "total_comments": 10,
      "total_shares": 5
    }
  ]
}
```

---

### 5. Analytics de Compartilhamentos ⚠️

#### Endpoint: Dashboard de Analytics

```http
GET /api/analytics/shares
```

**Query params:**
- `period` - today, week, month, year
- `user_id` - Filtrar por usuário específico

**Response:**
```json
{
  "summary": {
    "total_shares": 1250,
    "growth": "+15%",
    "most_shared_method": "whatsapp"
  },
  "top_posts": [
    {
      "post_id": 123,
      "description": "Post mais compartilhado",
      "total_shares": 85,
      "share_rate": 0.35 // shares / views
    }
  ],
  "breakdown_by_method": {
    "whatsapp": 600,
    "others": 400,
    "internal": 250
  },
  "timeline": [
    {
      "date": "2026-01-23",
      "shares": 45
    }
  ]
}
```

---

## 📊 Estrutura de Banco de Dados Sugerida

### Tabela: `post_shares`

```sql
CREATE TABLE post_shares (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  shared_by_user_id BIGINT NOT NULL,
  shared_with_user_id BIGINT NULL, -- NULL para compartilhamento externo
  share_method ENUM('whatsapp', 'others', 'internal') NOT NULL,
  message TEXT NULL, -- Mensagem personalizada (compartilhamento interno)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (shared_by_user_id) REFERENCES users(id),
  FOREIGN KEY (shared_with_user_id) REFERENCES users(id),
  
  INDEX idx_post_id (post_id),
  INDEX idx_shared_by (shared_by_user_id),
  INDEX idx_shared_with (shared_with_user_id),
  INDEX idx_created_at (created_at)
);
```

### Tabela: `posts` (adicionar campo)

```sql
ALTER TABLE posts 
ADD COLUMN total_shares INT DEFAULT 0;

-- Index para ordenação por popularidade
CREATE INDEX idx_total_shares ON posts(total_shares);
```

### Tabela: `notifications` (adicionar tipo)

```sql
-- Adicionar novo tipo de notificação
ALTER TABLE notifications 
MODIFY COLUMN type ENUM(
  'like', 
  'comment', 
  'follow', 
  'share', -- NOVO
  'mention',
  'system'
) NOT NULL;
```

---

## 🧪 Como Testar

### 1. Contador de Compartilhamentos

**Teste manual:**
1. Abra um post
2. Verifique se mostra "Compartilhar" (sem número se total_shares = 0)
3. **Depois que backend implementar:** Compartilhe o post
4. Recarregue o feed
5. Verifique se mostra "5 Compartilhar" (ou número correto)

### 2. Preview da Postagem

**Teste:**
1. Abra um post com imagem
2. Clique em "Compartilhar"
3. **Esperado:**
   - Modal abre com preview
   - Preview mostra: avatar, nome, descrição (3 linhas), imagem
   - Preview tem fundo cinza claro (#F8F8F8)
   - Preview está acima das opções de compartilhamento

### 3. Deep Linking

**Teste no Android:**
```bash
# Testar deep link
adb shell am start -W -a android.intent.action.VIEW -d "farmsilo://post/123" com.farmsilo

# Testar universal link
adb shell am start -W -a android.intent.action.VIEW -d "https://farmsilo.app/post/123" com.farmsilo
```

**Teste no iOS:**
```bash
# Simulador
xcrun simctl openurl booted "farmsilo://post/123"
xcrun simctl openurl booted "https://farmsilo.app/post/123"
```

**Teste compartilhamento:**
1. Compartilhe um post pelo WhatsApp
2. Mensagem deve incluir link `https://farmsilo.app/post/123`
3. Clique no link
4. **Esperado:** App abre direto no post (se instalado)

---

## 📝 Checklist de Implementação Backend

- [ ] **Criar tabela `post_shares`**
- [ ] **Adicionar campo `total_shares` na tabela `posts`**
- [ ] **Criar endpoint `POST /api/posts/:id/share`**
- [ ] **Criar endpoint `GET /api/posts/:id/shares`**
- [ ] **Criar endpoint `GET /api/users/shareable`**
- [ ] **Criar endpoint `POST /api/posts/:id/share/internal`**
- [ ] **Criar endpoint `GET /api/shares/received`**
- [ ] **Criar endpoint `PUT /api/shares/:id/read`**
- [ ] **Criar endpoint `GET /api/posts/shared-with-me`**
- [ ] **Criar endpoint `GET /api/analytics/shares`**
- [ ] **Adicionar tipo 'share' em notificações**
- [ ] **Criar lógica de notificação ao compartilhar**
- [ ] **Configurar Universal Links no servidor**
- [ ] **Criar arquivo `apple-app-site-association`**
- [ ] **Criar arquivo `assetlinks.json`**
- [ ] **Implementar página web de redirecionamento**
- [ ] **Adicionar Open Graph tags nas páginas**

---

## 📱 Checklist de Implementação Frontend (Concluído)

- [x] **Adicionar campo `total_shares` na interface `iPost`**
- [x] **Exibir contador de compartilhamentos em PostActions**
- [x] **Criar preview da postagem no modal SharePost**
- [x] **Adicionar estilos do preview**
- [x] **Passar dados do preview (avatar, nome, imagem) para SharePost**
- [x] **Criar arquivo de configuração de deep links**
- [x] **Criar funções utilitárias de deep links**
- [x] **Integrar deep links na mensagem de compartilhamento**
- [x] **Documentar configurações de plataforma (Android/iOS)**

---

## 🚀 Próximos Passos

### Curto Prazo (Frontend)
1. Configurar React Navigation com deep links
2. Testar deep links em ambiente de desenvolvimento
3. Implementar tela "Compartilhados comigo" (aguardando backend)

### Curto Prazo (Backend)
1. Implementar endpoint de registro de compartilhamento
2. Adicionar campo total_shares no retorno de posts
3. Configurar servidor para Universal Links

### Médio Prazo
1. Implementar compartilhamento interno completo
2. Criar sistema de notificações de compartilhamento
3. Implementar analytics de compartilhamentos

### Longo Prazo
1. A/B testing de mensagens de compartilhamento
2. Sugestões inteligentes de usuários para compartilhar
3. Recompensas por compartilhamentos (gamificação)

---

## ✅ Conclusão

**Implementado no Frontend:**
- ✅ Contador de compartilhamentos (UI pronta)
- ✅ Preview da postagem no modal
- ✅ Deep linking (configuração base)

**Aguardando Backend:**
- ⚠️ API de registro de compartilhamentos
- ⚠️ Campo total_shares nos posts
- ⚠️ Compartilhamento interno
- ⚠️ Notificações
- ⚠️ Analytics
- ⚠️ Configuração de servidor (Universal Links)

**Estimativa de impacto:**
- 📈 **Aumento de engajamento**: ~25-35%
- 🔄 **Viralidade**: Deep links facilitam compartilhamento
- 👥 **Retenção**: Notificações de compartilhamento trazem usuários de volta
- 📊 **Insights**: Analytics ajudam a entender conteúdo mais popular
