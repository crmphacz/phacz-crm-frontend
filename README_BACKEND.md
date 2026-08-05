# 📚 Documentação Backend - Farmsilo App

**Data de Criação:** 2026-01-23  
**Branch Frontend:** `test-feature`  
**Status:** Aguardando implementação backend

---

## 📖 Índice de Documentos

Este repositório contém 4 documentos principais para implementação das pendências de backend:

### 1. **BACKEND_SUMMARY.md** ⭐ (COMECE AQUI)
**Tamanho:** 271 linhas  
**Tempo de leitura:** 5 minutos

**Descrição:** Resumo executivo com visão geral rápida de todas as pendências.

**Contém:**
- ✅ Tabela resumo de prioridades
- ✅ Checklist rápido (9 migrations, 13 endpoints, 5 configs)
- ✅ Cronograma sugerido (2 semanas)
- ✅ Alertas de risco (churn, deep links)

**Quando usar:** Apresentação para gerência ou visão rápida do escopo.

---

### 2. **BACKEND_REQUIREMENTS.md** 📋 (ESPECIFICAÇÃO COMPLETA)
**Tamanho:** 1605 linhas  
**Tempo de leitura:** 30 minutos

**Descrição:** Especificação técnica detalhada de TODAS as pendências.

**Contém:**
- ✅ Análise request por request (8 requests)
- ✅ Estrutura de banco de dados (SQL completo)
- ✅ Especificação de endpoints (request/response)
- ✅ Configurações servidor web (deep links)
- ✅ Configurações plataformas (Apple, Google, Stripe)
- ✅ Checklist completo de implementação
- ✅ Cronograma detalhado
- ✅ Análise de riscos

**Quando usar:** Durante a implementação para consultar detalhes técnicos.

---

### 3. **BACKEND_SQL_SCRIPTS.sql** 💾 (SCRIPTS PRONTOS)
**Tamanho:** 410 linhas  
**Tempo de execução:** ~2 minutos (depende do tamanho do banco)

**Descrição:** Scripts SQL prontos para execução (PostgreSQL/MySQL).

**Contém:**
- ✅ Migrations completas (3 requests)
- ✅ Índices de performance
- ✅ Queries de validação
- ✅ Scripts de rollback (em caso de erro)
- ✅ Queries úteis para testes
- ✅ Comentários MySQL/PostgreSQL

**Quando usar:** Durante implementação do banco de dados.

⚠️ **IMPORTANTE:**
- Fazer backup antes de executar
- Testar em ambiente de desenvolvimento primeiro
- Ajustar sintaxe se usar MySQL (comentários incluídos)

---

### 4. **BACKEND_CODE_EXAMPLES.ts** 💻 (EXEMPLOS DE CÓDIGO)
**Tamanho:** 1045 linhas  
**Linguagem:** TypeScript/Node.js (adaptável)

**Descrição:** Exemplos práticos de implementação dos endpoints.

**Contém:**
- ✅ 13 endpoints completos com código
- ✅ Validações de negócio implementadas
- ✅ Tratamento de erros padronizado
- ✅ Testes unitários (Jest)
- ✅ Comentários explicativos

**Quando usar:** Durante desenvolvimento dos endpoints como referência.

**Endpoints incluídos:**
1. `GET /api/posts` (busca aproximada)
2. `GET /api/products` (busca aproximada)
3. `GET /api/users/search` (busca aproximada)
4. `POST /api/posts/:id/share`
5. `POST /api/posts/:id/share/internal`
6. `GET /api/users/shareable`
7. `POST /api/products` (com validações de limite)
8. `PUT /api/products/:id` (com validação de cooldown)
9. `DELETE /api/products/:id` (com atualização de contadores)
10. `GET /api/users/me` (com novos campos)
11. `GET /api/plans` (com novos campos)
12. Middleware de erro global
13. Testes unitários

---

## 🎯 Fluxo de Trabalho Recomendado

### Fase 1: Planejamento (Dia 1)
1. Ler **BACKEND_SUMMARY.md** (5 min)
2. Revisar **BACKEND_REQUIREMENTS.md** seções P0 (15 min)
3. Criar branch `backend/feature/frontend-sync`
4. Reunião de alinhamento com time

### Fase 2: Banco de Dados (Dia 1-2)
1. Abrir **BACKEND_SQL_SCRIPTS.sql**
2. Executar migrations em desenvolvimento
3. Validar estrutura com queries de verificação
4. Popular dados existentes (contadores)

### Fase 3: Endpoints P0 (Dia 2-4)
1. Abrir **BACKEND_CODE_EXAMPLES.ts**
2. Implementar endpoints:
   - Request 2: Busca Aproximada (3 endpoints)
   - Request 8: Planos (5 endpoints)
3. Testar localmente
4. Deploy em staging

### Fase 4: Configurações Externas (Dia 5)
1. Apple App Store Connect (atualizar preços)
2. Google Play Console (atualizar preços)
3. Stripe Dashboard (criar novos prices)
4. Comunicação com usuários (email/notificação)

### Fase 5: Endpoints P1 (Dia 6-8)
1. Implementar Request 7: Compartilhamento (5 endpoints)
2. Configurar deep links (servidor web)
3. Testar Universal Links (iOS/Android)

### Fase 6: Testes e Deploy (Dia 9-10)
1. Testes de integração
2. Validação de limites e cooldowns
3. Deploy em produção
4. Monitoramento de logs

---

## 📊 Visão Geral das Pendências

### Resumo por Request

| Request | Título | Prioridade | Endpoints | Migrations | Prazo |
|---------|--------|-----------|-----------|------------|-------|
| 1 | Texto Marketplace | - | 0 | 0 | ✅ Nenhuma ação |
| 2 | Busca Aproximada | **P0** | 3 | 1 | 3 dias |
| 3 | Animação Logo | - | 0 | 0 | ✅ Nenhuma ação |
| 4 | Lupa Header | - | 0 | 0 | ✅ Nenhuma ação |
| 5 | Botões Perfil | - | 0 | 0 | ✅ Nenhuma ação |
| 6 | Clicar Usuário Chat | - | 0 | 0 | ✅ Nenhuma ação |
| 7 | Compartilhamento | **P1** | 5 | 2 | 7 dias |
| 8 | Planos Assinatura | **P0** | 5 | 3 | 5 dias |

### Total de Trabalho

**Banco de Dados:**
- 6 migrations (3 tabelas alteradas, 1 tabela criada)
- 9 índices de performance

**Endpoints:**
- 13 endpoints novos ou modificados

**Servidor Web:**
- 5 configurações (deep links + fallbacks)

**Plataformas Externas:**
- 3 plataformas (Apple, Google, Stripe)

**Tempo estimado:** 10 dias úteis (2 semanas)

---

## ⚠️ Alertas Importantes

### 1. Request 8 - Mudança de Preços

**🚨 RISCO ALTO DE CHURN**

Os preços dos planos terão aumento significativo:
- **Pro:** R$ 14,90 → R$ 24,90 (+67%)
- **Premium:** R$ 24,90 → R$ 39,90 (+60%)

**Ações necessárias:**
1. ✅ Avisar usuários com **30 dias de antecedência**
2. ✅ Considerar **grandfathering** (manter preço antigo para usuários atuais)
3. ✅ Destacar **novos benefícios** (cooldown, limites)
4. ✅ Preparar **FAQ** sobre mudanças

**Aprovação Apple:**
- Tempo: 1-3 dias (imprevisível)
- Pode exigir nova versão do app
- Possível rejeição se não justificar aumento

### 2. Request 7 - Deep Links

**🚨 CONFIGURAÇÃO COMPLEXA**

Universal Links (iOS) e App Links (Android) são difíceis de validar:
- Requer acesso ao servidor web (Nginx/Apache)
- Requer certificado SSL válido
- Falhas são **silenciosas** (links não funcionam, sem erro)

**Validação obrigatória:**
- iOS: https://search.developer.apple.com/appsearch-validation-tool
- Android: https://digitalassetlinks.googleapis.com

**Arquivos necessários:**
- `.well-known/apple-app-site-association` (sem extensão .json)
- `.well-known/assetlinks.json`

### 3. Request 2 - Performance

**⚠️ ÍNDICES OBRIGATÓRIOS**

Busca aproximada pode ser **lenta** sem índices:
- PostgreSQL: Usar índices GIN (full-text) ou funcionais (LOWER + UNACCENT)
- MySQL: Criar função `remove_accents` + índices funcionais

**Testes de carga:**
- Validar com >10k registros
- Monitorar tempo de resposta (<200ms)

---

## 🔍 Detalhamento por Prioridade

### P0 - CRÍTICO (Implementar IMEDIATAMENTE)

#### Request 2: Busca Aproximada
**Por que é crítico:** Frontend já implementou, usuários esperando funcionalidade.

**Ações:**
1. Extensão `unaccent` (PostgreSQL)
2. Modificar 3 endpoints (posts, products, users)
3. Criar índices de performance

**Impacto:** UX degradado sem busca aproximada.

---

#### Request 8: Planos de Assinatura
**Por que é crítico:** Impacta receita, precisa aprovação Apple (1-3 dias).

**Ações:**
1. 3 migrations (plans, users, products)
2. 5 endpoints com validações
3. Configurações IAP (Apple, Google, Stripe)

**Impacto:** Usuários conseguem burlar limites sem validação backend.

---

### P1 - ALTA (Implementar em 2 semanas)

#### Request 7: Compartilhamento
**Por que é alta:** Aumenta engajamento, mas não bloqueia funcionalidades atuais.

**Ações:**
1. 2 migrations (post_shares, total_shares)
2. 5 endpoints de compartilhamento
3. Configuração deep links

**Impacto:** Funcionalidade de compartilhamento incompleta.

---

## 📞 Suporte e Dúvidas

Para esclarecimentos sobre esta documentação:
1. Revisar **BACKEND_REQUIREMENTS.md** seção específica
2. Consultar **BACKEND_CODE_EXAMPLES.ts** para exemplos
3. Abrir issue no repositório com tag `backend-sync`

---

## 🧪 Testes Essenciais

### Request 2 - Busca
- [ ] "cafe" encontra "café"
- [ ] "SILVA" encontra "silva"  
- [ ] "joao" encontra "João Silva"
- [ ] Performance com >10k registros

### Request 7 - Compartilhamento
- [ ] Compartilhar no WhatsApp incrementa contador
- [ ] Compartilhamento interno cria notificação
- [ ] Deep link abre app (iOS/Android)
- [ ] Fallback para loja funciona

### Request 8 - Planos
- [ ] Free: Bloqueio no 4º produto
- [ ] Pro: Bloqueio no 11º produto
- [ ] Pro: Bloqueio de edição antes de 6 meses
- [ ] Premium: Edição ilimitada
- [ ] Deleção decrementa `active_products_count`
- [ ] Upgrade de plano libera limites

---

## 📅 Cronograma Visual

```
Semana 1
├─ Dia 1: Planejamento + Migrations
├─ Dia 2: Request 8 - Endpoints (Planos)
├─ Dia 3: Request 2 - Endpoints (Busca)
├─ Dia 4: Testes P0
└─ Dia 5: Deploy P0 + Configurações IAP

Semana 2
├─ Dia 6-7: Request 7 - Endpoints (Compartilhamento)
├─ Dia 8: Configuração Deep Links
├─ Dia 9: Testes P1
└─ Dia 10: Deploy P1 + Monitoramento
```

---

## ✅ Checklist Final

**Antes de começar:**
- [ ] Backup do banco de dados
- [ ] Branch criada (`backend/feature/frontend-sync`)
- [ ] Ambiente de desenvolvimento configurado
- [ ] Acesso às plataformas (Apple, Google, Stripe)

**Durante implementação:**
- [ ] Migrations executadas em dev
- [ ] Endpoints testados localmente
- [ ] Códigos de erro padronizados
- [ ] Logs adicionados

**Antes de deploy:**
- [ ] Testes de integração passando
- [ ] Configurações externas validadas
- [ ] Comunicação com usuários enviada (mudanças de preço)
- [ ] Rollback plan preparado

**Após deploy:**
- [ ] Monitorar logs por 24h
- [ ] Validar métricas (compartilhamentos, criação de produtos)
- [ ] Coletar feedback de usuários
- [ ] Atualizar documentação se necessário

---

**Última atualização:** 2026-01-23  
**Versão:** 1.0  
**Próxima revisão:** Após implementação
