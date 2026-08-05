# Análise de Viabilidade - Nova Lógica de Planos de Assinatura

## 📊 Mudanças Solicitadas

### **Plano Free (R$ 0,00/mês)**
| Antes | Depois |
|-------|--------|
| 3 anúncios no marketplace | 3 anúncios no marketplace |
| Altere seus anúncios 1 vez por mês | ~~Altere seus anúncios 1 vez por mês~~ |
| - | **NOVO:** Quantidade de anúncios criados (limite total de 3, na 4ª tentativa exige upgrade) |

### **Plano Pro**
| Antes | Depois |
|-------|--------|
| 10 anúncios no marketplace | 10 anúncios no marketplace |
| Altere seus anúncios 2 vez por mês | ~~Altere seus anúncios 2 vez por mês~~ |
| R$ 14,90/mês | **R$ 24,90/mês** |
| - | **NOVO:** Troque seus anúncios a cada 6 meses |
| - | **NOVO:** Na 10ª tentativa de criar anúncio, exige upgrade |

### **Plano Premium**
| Antes | Depois |
|-------|--------|
| Anuncie quando quiser no Marketplace | Anuncie quando quiser no Marketplace |
| - | **NOVO:** Altere seus anúncios sempre que quiser |
| R$ 24,90/mês | **R$ 39,90/mês** |

---

## ✅ Viabilidade Técnica - Frontend

### **É VIÁVEL? SIM ✅**

O frontend pode implementar:
1. ✅ **Exibição das novas regras** nos cards de planos
2. ✅ **Bloqueio visual** ao tentar criar produto além do limite
3. ✅ **Modal de upgrade** quando limite atingido
4. ✅ **Validação client-side** antes de enviar ao backend
5. ✅ **Mensagens explicativas** sobre limites e restrições

### **O que NÃO pode ser feito apenas no Frontend:**
- ❌ Validação definitiva de limites (pode ser bypassada)
- ❌ Controle de "quantidade total criada" (precisa persistir no BD)
- ❌ Controle de cooldown de edição (precisa data da última edição)
- ❌ Aplicação de preços nos pagamentos (depende de configuração IAP/Stripe)

---

## 🔧 Implementação Frontend

### 1. Interface Atualizada

```typescript
// src/interfaces/hooks/payment.tsx
export interface iPlan {
  id: number;
  name: string;
  apple_id: string;
  value: string;
  max_marketplace_items: number;           // 3, 10, 9999 (ilimitado)
  max_marketplace_updates: number;         // Remover ou depreciar
  edit_cooldown_months: number;            // NOVO: 0, 6, 0 (Free, Pro, Premium)
  max_total_products_created: number;      // NOVO: 3, 10, 9999 (limite total)
  can_edit_anytime: boolean;               // NOVO: false, false, true
  created_at: string;
  updated_at: string;
}

// src/interfaces/hooks/user.tsx (adicionar ao plan)
export interface iMe {
  // ... outros campos
  plan: {
    id: number;
    name: string;
    value: string;
    max_marketplace_items: number;
    max_marketplace_updates: number;         // Depreciar
    edit_cooldown_months: number;            // NOVO
    max_total_products_created: number;      // NOVO
    can_edit_anytime: boolean;               // NOVO
    created_at: string;
    updated_at: string;
  };
  total_products_created: number;            // NOVO: contador total
  active_products_count: number;             // Produtos ativos no momento
  last_product_edit_date: string | null;     // NOVO: data da última edição
}
```

### 2. Lógica de Validação (Frontend)

```typescript
// src/utils/planValidation.ts
export const canCreateProduct = (user: iMe): {
  canCreate: boolean;
  reason?: string;
  requiresUpgrade?: boolean;
} => {
  const { plan, total_products_created, active_products_count } = user;

  // Verifica limite de produtos ativos
  if (active_products_count >= plan.max_marketplace_items && plan.max_marketplace_items !== 9999) {
    return {
      canCreate: false,
      reason: `Você atingiu o limite de ${plan.max_marketplace_items} anúncios ativos. Exclua um anúncio ou faça upgrade.`,
      requiresUpgrade: false,
    };
  }

  // Verifica limite total de produtos criados (Free: 3, Pro: 10)
  if (total_products_created >= plan.max_total_products_created && plan.max_total_products_created !== 9999) {
    return {
      canCreate: false,
      reason: `Você atingiu o limite de ${plan.max_total_products_created} anúncios criados no total. Faça upgrade para criar mais.`,
      requiresUpgrade: true,
    };
  }

  return { canCreate: true };
};

export const canEditProduct = (user: iMe, lastEditDate: string | null): {
  canEdit: boolean;
  reason?: string;
  nextEditDate?: Date;
} => {
  const { plan } = user;

  // Premium pode editar sempre
  if (plan.can_edit_anytime) {
    return { canEdit: true };
  }

  // Se nunca editou, pode editar
  if (!lastEditDate) {
    return { canEdit: true };
  }

  // Calcula próxima data permitida
  const lastEdit = new Date(lastEditDate);
  const cooldownMonths = plan.edit_cooldown_months;
  const nextEditDate = new Date(lastEdit);
  nextEditDate.setMonth(nextEditDate.getMonth() + cooldownMonths);

  const now = new Date();

  if (now < nextEditDate) {
    return {
      canEdit: false,
      reason: `Você poderá editar este anúncio novamente em ${nextEditDate.toLocaleDateString('pt-BR')}`,
      nextEditDate,
    };
  }

  return { canEdit: true };
};
```

### 3. Componente de Validação

```typescript
// src/components/molecules/productLimitWarning/index.tsx
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '../../atoms';

interface Props {
  reason: string;
  requiresUpgrade: boolean;
  onUpgradePress: () => void;
}

const ProductLimitWarning = ({ reason, requiresUpgrade, onUpgradePress }: Props) => {
  return (
    <View style={styles.container}>
      <Text type="subtitle" weight="bold" color="red">
        Limite Atingido
      </Text>
      <Text style={styles.reason}>{reason}</Text>
      
      {requiresUpgrade && (
        <TouchableOpacity onPress={onUpgradePress} style={styles.upgradeButton}>
          <Text color="white" weight="bold">Fazer Upgrade</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
```

### 4. Atualização do PlanCard

```typescript
// Novas features baseadas no plano
const renderFeatures = () => {
  const features = [];

  // Feature 1: Limite de anúncios
  if (plan.max_marketplace_items === 9999) {
    features.push('Anuncie quando quiser no Marketplace');
  } else {
    features.push(`${plan.max_marketplace_items} anúncios no marketplace`);
  }

  // Feature 2: Limite total criado (Free e Pro)
  if (plan.max_total_products_created !== 9999) {
    if (plan.name === 'Free') {
      features.push('Quantidade de anúncios criados');
    } else if (plan.name === 'Pro') {
      features.push('Troque seus anúncios a cada 6 meses');
    }
  }

  // Feature 3: Edição (Premium)
  if (plan.can_edit_anytime) {
    features.push('Altere seus anúncios sempre que quiser');
  }

  return features;
};
```

---

## 🔴 Ações Necessárias no Backend

### 1. Banco de Dados

#### Tabela `plans` (adicionar campos)

```sql
ALTER TABLE plans 
ADD COLUMN edit_cooldown_months INT DEFAULT 0 COMMENT 'Meses de cooldown para edição (0 = sem cooldown)',
ADD COLUMN max_total_products_created INT DEFAULT 9999 COMMENT 'Limite total de produtos que podem ser criados',
ADD COLUMN can_edit_anytime BOOLEAN DEFAULT FALSE COMMENT 'Se pode editar anúncios sem restrição';

-- Atualizar planos existentes
UPDATE plans SET 
  edit_cooldown_months = 0,
  max_total_products_created = 3,
  can_edit_anytime = FALSE
WHERE name = 'Free';

UPDATE plans SET 
  edit_cooldown_months = 6,
  max_total_products_created = 10,
  can_edit_anytime = FALSE
WHERE name = 'Pro';

UPDATE plans SET 
  edit_cooldown_months = 0,
  max_total_products_created = 9999,
  can_edit_anytime = TRUE
WHERE name = 'Premium';
```

#### Tabela `users` (adicionar campos)

```sql
ALTER TABLE users 
ADD COLUMN total_products_created INT DEFAULT 0 COMMENT 'Contador total de produtos criados pelo usuário',
ADD COLUMN active_products_count INT DEFAULT 0 COMMENT 'Produtos ativos no momento';
```

#### Tabela `products` (adicionar campo)

```sql
ALTER TABLE products 
ADD COLUMN last_edit_date TIMESTAMP NULL COMMENT 'Data da última edição do produto';
```

### 2. Endpoints - Validações

#### `POST /api/products` (Criar Produto)

```typescript
// Validações necessárias:
async function createProduct(userId: number, productData: any) {
  const user = await getUserWithPlan(userId);
  const { plan, total_products_created, active_products_count } = user;

  // Validação 1: Limite de produtos ativos
  if (active_products_count >= plan.max_marketplace_items && plan.max_marketplace_items !== 9999) {
    throw new Error('LIMIT_ACTIVE_PRODUCTS', {
      limit: plan.max_marketplace_items,
      current: active_products_count,
    });
  }

  // Validação 2: Limite total de produtos criados
  if (total_products_created >= plan.max_total_products_created && plan.max_total_products_created !== 9999) {
    throw new Error('LIMIT_TOTAL_CREATED', {
      limit: plan.max_total_products_created,
      current: total_products_created,
      requiresUpgrade: true,
    });
  }

  // Criar produto
  const product = await db.products.create({
    ...productData,
    user_id: userId,
  });

  // Incrementar contadores
  await db.users.update(userId, {
    total_products_created: total_products_created + 1,
    active_products_count: active_products_count + 1,
  });

  return product;
}
```

#### `PUT /api/products/:id` (Editar Produto)

```typescript
async function updateProduct(userId: number, productId: number, productData: any) {
  const user = await getUserWithPlan(userId);
  const product = await db.products.findOne({ id: productId, user_id: userId });

  if (!product) {
    throw new Error('PRODUCT_NOT_FOUND');
  }

  // Validação: Cooldown de edição
  if (!user.plan.can_edit_anytime) {
    const lastEditDate = product.last_edit_date ? new Date(product.last_edit_date) : null;
    
    if (lastEditDate) {
      const cooldownMonths = user.plan.edit_cooldown_months;
      const nextAllowedEdit = new Date(lastEditDate);
      nextAllowedEdit.setMonth(nextAllowedEdit.getMonth() + cooldownMonths);

      const now = new Date();

      if (now < nextAllowedEdit) {
        throw new Error('EDIT_COOLDOWN', {
          nextEditDate: nextAllowedEdit.toISOString(),
          cooldownMonths,
        });
      }
    }
  }

  // Atualizar produto
  const updated = await db.products.update(productId, {
    ...productData,
    last_edit_date: new Date(),
  });

  return updated;
}
```

#### `DELETE /api/products/:id` (Deletar Produto)

```typescript
async function deleteProduct(userId: number, productId: number) {
  const user = await getUserWithPlan(userId);
  const product = await db.products.findOne({ id: productId, user_id: userId });

  if (!product) {
    throw new Error('PRODUCT_NOT_FOUND');
  }

  // Deletar produto
  await db.products.delete(productId);

  // Decrementar contador de produtos ativos
  await db.users.update(userId, {
    active_products_count: user.active_products_count - 1,
  });

  // NÃO decrementar total_products_created (é um contador cumulativo)
  
  return { success: true };
}
```

#### `GET /api/users/me` (Dados do Usuário)

```typescript
// Retornar novos campos
{
  id: 123,
  name: "João Silva",
  // ... outros campos
  plan: {
    id: 2,
    name: "Pro",
    value: "24.90",
    max_marketplace_items: 10,
    max_marketplace_updates: 0, // Depreciar
    edit_cooldown_months: 6,    // NOVO
    max_total_products_created: 10, // NOVO
    can_edit_anytime: false,    // NOVO
  },
  total_products_created: 5,    // NOVO
  active_products_count: 3,     // NOVO
  last_product_edit_date: "2026-01-15T10:30:00Z" // NOVO
}
```

### 3. Atualização de Preços - IAP / Stripe

#### **Apple In-App Purchase (iOS)**

**Arquivo:** Apple App Store Connect

1. Acessar App Store Connect → Seu App → In-App Purchases
2. Atualizar produtos:
   - **Pro**: R$ 14,90 → **R$ 24,90**
   - **Premium**: R$ 24,90 → **R$ 39,90**
3. Submeter para aprovação da Apple
4. Aguardar aprovação (1-2 dias úteis)

**⚠️ IMPORTANTE:** 
- Preços existentes em assinaturas ativas não mudam automaticamente
- Novos usuários pagam o novo preço
- Usuários existentes:
  - Podem manter preço antigo até renovação
  - Devem ser notificados 30 dias antes da mudança de preço

#### **Google Play (Android)**

**Arquivo:** Google Play Console

1. Acessar Google Play Console → Seu App → In-app products
2. Atualizar produtos:
   - **Pro**: R$ 14,90 → **R$ 24,90**
   - **Premium**: R$ 24,90 → **R$ 39,90**
3. Publicar alterações

**⚠️ IMPORTANTE:**
- Google permite aumentar preço para assinaturas existentes
- Usuários devem confirmar novo preço
- Notificação automática enviada pelo Google Play

#### **Stripe (Web/Fallback)**

**Backend:** Atualizar `src/hooks/payment/index.tsx`

```typescript
// Atualizar prices no backend
const STRIPE_PRICES = {
  pro: 'price_NEW_PRO_24_90',      // Criar novo price no Stripe
  premium: 'price_NEW_PREMIUM_39_90' // Criar novo price no Stripe
};
```

**Passos no Stripe Dashboard:**
1. Criar novos "Prices" para Pro e Premium
2. Atualizar referências no código backend
3. Manter prices antigos para assinaturas existentes

---

## 📱 Configurações Necessárias em Outras Plataformas

### **1. Apple App Store Connect**

**Ações necessárias:**
1. ✅ Atualizar preços dos produtos IAP
2. ✅ Atualizar descrições dos produtos (incluir novas features)
3. ✅ Submeter para revisão
4. ⚠️ **Política de preços:** Apple exige notificar usuários 30 dias antes de aumentar preço

**Tempo estimado:** 1-3 dias úteis (revisão Apple)

### **2. Google Play Console**

**Ações necessárias:**
1. ✅ Atualizar preços dos produtos in-app
2. ✅ Atualizar descrições
3. ✅ Publicar alterações
4. ⚠️ **Usuários ativos:** Google notifica automaticamente sobre mudança de preço

**Tempo estimado:** Imediato (sem revisão)

### **3. Stripe Dashboard**

**Ações necessárias:**
1. ✅ Criar novos "Prices" com valores atualizados
2. ✅ Atualizar configuração no backend
3. ✅ Migrar assinaturas existentes (opcional)
4. ⚠️ **Webhooks:** Testar eventos de upgrade/downgrade

**Tempo estimado:** Imediato

### **4. Backend (Servidor)**

**Ações necessárias:**
1. ✅ Atualizar tabela `plans` no banco de dados
2. ✅ Adicionar novos campos nas tabelas `users` e `products`
3. ✅ Implementar validações de limite
4. ✅ Criar endpoints de validação
5. ✅ Atualizar `GET /api/users/me` para retornar novos campos
6. ✅ Criar migrations
7. ✅ Testar em ambiente de staging

**Tempo estimado:** 2-3 dias de desenvolvimento + 1 dia de testes

---

## 🧪 Testes Necessários

### **Testes de Plano Free**

- [ ] Criar 3 produtos com sucesso
- [ ] Tentar criar 4º produto → Bloquear com mensagem de upgrade
- [ ] Deletar 1 produto → Poder criar outro (limite ativo)
- [ ] Tentar editar produto antes do cooldown (1 mês) → Bloquear
- [ ] Editar produto após 1 mês → Permitir

### **Testes de Plano Pro**

- [ ] Criar 10 produtos com sucesso
- [ ] Tentar criar 11º produto → Bloquear com mensagem de upgrade
- [ ] Editar produto → Atualizar `last_edit_date`
- [ ] Tentar editar novamente antes de 6 meses → Bloquear
- [ ] Editar após 6 meses → Permitir

### **Testes de Plano Premium**

- [ ] Criar produtos ilimitados
- [ ] Editar produtos sem restrições de cooldown
- [ ] Verificar que não há bloqueios de limite

### **Testes de Upgrade**

- [ ] Free → Pro: Limite muda de 3 para 10
- [ ] Pro → Premium: Edição ilimitada habilitada
- [ ] Verificar persistência de `total_products_created`

---

## 💰 Implicações Financeiras

### **Aumento de Preços**

| Plano | Preço Atual | Preço Novo | Aumento |
|-------|-------------|------------|---------|
| Free | R$ 0,00 | R$ 0,00 | - |
| Pro | R$ 14,90 | R$ 24,90 | +67% (R$ 10,00) |
| Premium | R$ 24,90 | R$ 39,90 | +60% (R$ 15,00) |

### **Impactos**

**Positivos:**
- 💰 **Receita aumenta** se usuários mantiverem assinaturas
- 📈 **Valor agregado** com novas features (edição ilimitada no Premium)
- 🎯 **Segmentação clara** entre planos

**Riscos:**
- ⚠️ **Churn**: Usuários podem cancelar (principalmente Pro)
- ⚠️ **Aumento de 67%** no Pro é significativo
- ⚠️ **Concorrência**: Verificar preços de apps similares

**Recomendações:**
1. **Comunicação:** Notificar usuários com antecedência (30 dias)
2. **Grandfathering:** Considerar manter preço antigo para assinantes atuais por período limitado
3. **Promoção:** Oferecer desconto para upgrade imediato
4. **A/B Testing:** Testar novos preços com pequeno grupo primeiro

---

## 📋 Checklist de Implementação

### **Frontend** ✅ (Pode ser feito imediatamente)

- [x] Analisar viabilidade técnica
- [ ] Adicionar novos campos nas interfaces TypeScript
- [ ] Criar funções de validação de limites (`canCreateProduct`, `canEditProduct`)
- [ ] Atualizar `PlanCard` com novas descrições
- [ ] Criar componente `ProductLimitWarning`
- [ ] Adicionar validação antes de criar/editar produto
- [ ] Implementar modal de upgrade
- [ ] Testar fluxo de bloqueio/upgrade
- [ ] Atualizar traduções (i18n)

**Tempo estimado:** 1-2 dias

### **Backend** ⚠️ (Bloqueante para ativar recursos)

- [ ] Criar migration para adicionar campos nas tabelas
- [ ] Atualizar API `/api/plans` para retornar novos campos
- [ ] Atualizar API `/api/users/me` para retornar novos campos
- [ ] Implementar validação em `POST /api/products`
- [ ] Implementar validação em `PUT /api/products/:id`
- [ ] Atualizar lógica em `DELETE /api/products/:id`
- [ ] Criar endpoint de verificação de limites
- [ ] Testar validações em staging
- [ ] Deploy em produção

**Tempo estimado:** 2-3 dias

### **Plataformas de Pagamento** ⚠️ (Bloqueante para novos preços)

- [ ] **Apple App Store Connect:**
  - [ ] Atualizar preço Pro (R$ 24,90)
  - [ ] Atualizar preço Premium (R$ 39,90)
  - [ ] Atualizar descrições de produtos
  - [ ] Submeter para revisão
  - [ ] Aguardar aprovação (1-3 dias)
  
- [ ] **Google Play Console:**
  - [ ] Atualizar preço Pro (R$ 24,90)
  - [ ] Atualizar preço Premium (R$ 39,90)
  - [ ] Publicar alterações

- [ ] **Stripe Dashboard:**
  - [ ] Criar novo Price para Pro (R$ 24,90)
  - [ ] Criar novo Price para Premium (R$ 39,90)
  - [ ] Atualizar referências no backend
  - [ ] Testar webhooks

**Tempo estimado:** 1-3 dias (depende de aprovação Apple)

### **Comunicação com Usuários** 📣

- [ ] Criar email/notificação sobre mudanças
- [ ] Enviar notificação in-app sobre novos recursos
- [ ] Atualizar FAQ/documentação
- [ ] Preparar suporte para dúvidas sobre limites
- [ ] Criar material de marketing destacando novas features

**Tempo estimado:** 1 dia

---

## ⏱️ Cronograma Sugerido

### **Semana 1: Preparação**
- Dia 1-2: Desenvolvimento frontend (validações e UI)
- Dia 3-4: Desenvolvimento backend (APIs e validações)
- Dia 5: Testes internos

### **Semana 2: Aprovações**
- Dia 1: Submeter para Apple App Store Connect
- Dia 1: Atualizar Google Play e Stripe
- Dia 2-4: Aguardar aprovação Apple
- Dia 5: Preparar comunicação com usuários

### **Semana 3: Lançamento**
- Dia 1: Ativar novos preços (após aprovação)
- Dia 1: Enviar notificações para usuários
- Dia 2-5: Monitorar feedback e métricas

**Tempo total estimado:** 3 semanas

---

## ✅ Conclusão

### **É Viável? SIM ✅**

Todas as mudanças solicitadas **são tecnicamente viáveis** e podem ser implementadas.

### **Principais Pontos:**

1. ✅ **Frontend:** Pode implementar UI e validações client-side
2. ⚠️ **Backend:** OBRIGATÓRIO para validações definitivas
3. ⚠️ **Plataformas:** Necessário atualizar Apple, Google e Stripe
4. 💰 **Preços:** Aumento significativo (Pro +67%, Premium +60%)
5. 📣 **Comunicação:** Essencial notificar usuários com antecedência

### **Riscos:**

- ⚠️ Aumento de preço pode causar cancelamentos
- ⚠️ Aprovação da Apple pode atrasar lançamento
- ⚠️ Usuários existentes podem ficar insatisfeitos

### **Recomendações:**

1. Implementar backend primeiro (validações essenciais)
2. Testar extensivamente em staging
3. Comunicar mudanças com 30 dias de antecedência
4. Considerar "grandfathering" para usuários atuais
5. Monitorar métricas de churn após mudança
6. Preparar suporte para dúvidas frequentes

**Próximo passo:** Aprovar cronograma e iniciar desenvolvimento backend.
