# Exemplos de Implementação - Endpoints Backend

**Data:** 2026-01-23  
**Linguagem:** TypeScript/Node.js (adaptável para outras stacks)

---

## 📋 Índice

1. [Request 2: Busca Aproximada](#request-2-busca-aproximada)
2. [Request 7: Compartilhamento](#request-7-compartilhamento)
3. [Request 8: Planos de Assinatura](#request-8-planos-de-assinatura)
4. [Tratamento de Erros](#tratamento-de-erros)

---

## Request 2: Busca Aproximada

### 1. GET /api/posts (Busca Aproximada)

```typescript
// src/controllers/PostController.ts

import { Request, Response } from 'express';
import { db } from '../database';

interface PostQueryParams {
  skip: number;
  take: number;
  user_id?: number;
  only_followers?: boolean;
  search?: string;
}

export async function getPosts(req: Request, res: Response) {
  try {
    const { 
      skip = 0, 
      take = 30, 
      user_id, 
      only_followers, 
      search 
    } = req.query as any as PostQueryParams;

    // Base query
    let query = `
      SELECT 
        p.id,
        p.description,
        p.total_likes,
        p.total_comments,
        p.total_shares,
        p.created_at,
        EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as user_liked,
        json_build_object(
          'id', u.id,
          'name', u.name,
          'username', u.username,
          'avatar', u.avatar
        ) as user,
        (
          SELECT json_agg(
            json_build_object(
              'id', pm.id,
              'type', pm.type,
              'uri', pm.uri,
              'thumb_uri', pm.thumb_uri,
              'aspect_ratio', pm.aspect_ratio
            )
          )
          FROM post_medias pm
          WHERE pm.post_id = p.id
        ) as post_medias
      FROM posts p
      INNER JOIN users u ON u.id = p.user_id
      WHERE 1=1
    `;

    const params: any[] = [req.user.id]; // $1 = current user id

    // Filtro de busca aproximada
    if (search && search.trim().length > 0) {
      query += ` AND LOWER(UNACCENT(p.description)) LIKE LOWER(UNACCENT($${params.length + 1}))`;
      params.push(`%${search}%`);
    }

    // Filtro por usuário específico
    if (user_id) {
      query += ` AND p.user_id = $${params.length + 1}`;
      params.push(user_id);
    }

    // Filtro de seguidores
    if (only_followers === true) {
      query += ` 
        AND EXISTS(
          SELECT 1 FROM user_follows 
          WHERE follower_id = $1 AND followed_id = p.user_id
        )
      `;
    }

    // Ordenação e paginação
    query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(take, skip);

    // Query de contagem total
    let countQuery = `SELECT COUNT(*) FROM posts p WHERE 1=1`;
    const countParams: any[] = [];

    if (search && search.trim().length > 0) {
      countQuery += ` AND LOWER(UNACCENT(p.description)) LIKE LOWER(UNACCENT($${countParams.length + 1}))`;
      countParams.push(`%${search}%`);
    }

    if (user_id) {
      countQuery += ` AND p.user_id = $${countParams.length + 1}`;
      countParams.push(user_id);
    }

    // Executar queries
    const [posts, totalResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams),
    ]);

    return res.json({
      total: parseInt(totalResult.rows[0].count),
      records: posts.rows,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return res.status(500).json({
      status: 500,
      message: 'Erro ao buscar postagens',
    });
  }
}
```

### 2. GET /api/products (Busca Aproximada)

```typescript
// src/controllers/ProductController.ts

export async function getProducts(req: Request, res: Response) {
  try {
    const { skip = 0, take = 30, search } = req.query as any;

    let query = `
      SELECT 
        p.id,
        p.name,
        p.created_at,
        (
          SELECT pm.uri 
          FROM product_medias pm 
          WHERE pm.product_id = p.id 
          ORDER BY pm.id ASC 
          LIMIT 1
        ) as media,
        (
          SELECT pm.type 
          FROM product_medias pm 
          WHERE pm.product_id = p.id 
          ORDER BY pm.id ASC 
          LIMIT 1
        ) as media_type
      FROM products p
      WHERE 1=1
    `;

    const params: any[] = [];

    // Busca aproximada em nome E descrição
    if (search && search.trim().length > 0) {
      query += ` 
        AND (
          LOWER(UNACCENT(p.name)) LIKE LOWER(UNACCENT($${params.length + 1}))
          OR LOWER(UNACCENT(p.description)) LIKE LOWER(UNACCENT($${params.length + 1}))
        )
      `;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(take, skip);

    // Count query
    let countQuery = `SELECT COUNT(*) FROM products p WHERE 1=1`;
    const countParams: any[] = [];

    if (search && search.trim().length > 0) {
      countQuery += ` 
        AND (
          LOWER(UNACCENT(p.name)) LIKE LOWER(UNACCENT($${countParams.length + 1}))
          OR LOWER(UNACCENT(p.description)) LIKE LOWER(UNACCENT($${countParams.length + 1}))
        )
      `;
      countParams.push(`%${search}%`);
    }

    const [products, totalResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams),
    ]);

    return res.json({
      total: parseInt(totalResult.rows[0].count),
      records: products.rows,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({
      status: 500,
      message: 'Erro ao buscar produtos',
    });
  }
}
```

### 3. GET /api/users/search (Busca Aproximada)

```typescript
// src/controllers/UserController.ts

export async function searchUsers(req: Request, res: Response) {
  try {
    const { skip = 0, take = 30, search } = req.query as any;
    const currentUserId = req.user.id;

    let query = `
      SELECT 
        u.id,
        u.name,
        u.username,
        u.avatar,
        u.bio,
        ut.name as user_type_name,
        EXISTS(
          SELECT 1 FROM user_follows 
          WHERE follower_id = $1 AND followed_id = u.id
        ) as is_following
      FROM users u
      LEFT JOIN user_types ut ON ut.id = u.user_type_id
      WHERE 1=1
    `;

    const params: any[] = [currentUserId];

    // Busca aproximada em nome E username
    if (search && search.trim().length > 0) {
      query += ` 
        AND (
          LOWER(UNACCENT(u.name)) LIKE LOWER(UNACCENT($${params.length + 1}))
          OR LOWER(UNACCENT(u.username)) LIKE LOWER(UNACCENT($${params.length + 1}))
        )
      `;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY u.name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(take, skip);

    // Count query
    let countQuery = `SELECT COUNT(*) FROM users u WHERE 1=1`;
    const countParams: any[] = [];

    if (search && search.trim().length > 0) {
      countQuery += ` 
        AND (
          LOWER(UNACCENT(u.name)) LIKE LOWER(UNACCENT($${countParams.length + 1}))
          OR LOWER(UNACCENT(u.username)) LIKE LOWER(UNACCENT($${countParams.length + 1}))
        )
      `;
      countParams.push(`%${search}%`);
    }

    const [users, totalResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams),
    ]);

    return res.json({
      total: parseInt(totalResult.rows[0].count),
      records: users.rows.map(user => ({
        ...user,
        user_type: { name: user.user_type_name },
      })),
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return res.status(500).json({
      status: 500,
      message: 'Erro ao buscar usuários',
    });
  }
}
```

---

## Request 7: Compartilhamento

### 1. POST /api/posts/:id/share

```typescript
// src/controllers/ShareController.ts

export async function sharePost(req: Request, res: Response) {
  try {
    const { id: postId } = req.params;
    const { share_method } = req.body;
    const userId = req.user.id;

    // Validações
    if (!['whatsapp', 'others', 'internal'].includes(share_method)) {
      return res.status(400).json({
        code: 'INVALID_SHARE_METHOD',
        message: 'Método de compartilhamento inválido',
      });
    }

    // Verificar se post existe
    const postResult = await db.query(
      'SELECT id, total_shares FROM posts WHERE id = $1',
      [postId]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({
        code: 'POST_NOT_FOUND',
        message: 'Post não encontrado',
      });
    }

    const post = postResult.rows[0];

    // Criar registro de compartilhamento
    await db.query(
      `INSERT INTO post_shares (post_id, user_id, share_method, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [postId, userId, share_method]
    );

    // Incrementar contador
    const updatedPost = await db.query(
      `UPDATE posts 
       SET total_shares = total_shares + 1 
       WHERE id = $1 
       RETURNING total_shares`,
      [postId]
    );

    return res.json({
      success: true,
      total_shares: updatedPost.rows[0].total_shares,
      message: 'Compartilhamento registrado com sucesso',
    });
  } catch (error) {
    console.error('Error sharing post:', error);
    return res.status(500).json({
      status: 500,
      message: 'Erro ao compartilhar post',
    });
  }
}
```

### 2. POST /api/posts/:id/share/internal

```typescript
export async function sharePostInternally(req: Request, res: Response) {
  try {
    const { id: postId } = req.params;
    const { user_ids } = req.body;
    const senderId = req.user.id;

    // Validações
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({
        code: 'INVALID_USER_IDS',
        message: 'Lista de usuários inválida',
      });
    }

    if (user_ids.length > 50) {
      return res.status(400).json({
        code: 'TOO_MANY_USERS',
        message: 'Máximo de 50 usuários por vez',
      });
    }

    // Verificar se post existe
    const postResult = await db.query(
      'SELECT id, description, user_id FROM posts WHERE id = $1',
      [postId]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({
        code: 'POST_NOT_FOUND',
        message: 'Post não encontrado',
      });
    }

    const post = postResult.rows[0];

    // Buscar nome do remetente
    const senderResult = await db.query(
      'SELECT name FROM users WHERE id = $1',
      [senderId]
    );
    const senderName = senderResult.rows[0].name;

    // Iniciar transação
    await db.query('BEGIN');

    try {
      // Criar compartilhamentos e notificações
      for (const recipientId of user_ids) {
        // Criar registro de compartilhamento
        await db.query(
          `INSERT INTO post_shares 
           (post_id, user_id, share_method, shared_with_user_id, created_at)
           VALUES ($1, $2, 'internal', $3, NOW())`,
          [postId, senderId, recipientId]
        );

        // Criar notificação
        await db.query(
          `INSERT INTO notifications 
           (user_id, type, sender_id, post_id, message, read, created_at)
           VALUES ($1, 'POST_SHARED', $2, $3, $4, false, NOW())`,
          [
            recipientId,
            senderId,
            postId,
            `${senderName} compartilhou uma publicação com você`,
          ]
        );
      }

      // Incrementar contador de compartilhamentos
      const updatedPost = await db.query(
        `UPDATE posts 
         SET total_shares = total_shares + $1 
         WHERE id = $2 
         RETURNING total_shares`,
        [user_ids.length, postId]
      );

      await db.query('COMMIT');

      return res.json({
        success: true,
        shared_with: user_ids.length,
        total_shares: updatedPost.rows[0].total_shares,
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error sharing post internally:', error);
    return res.status(500).json({
      status: 500,
      message: 'Erro ao compartilhar post internamente',
    });
  }
}
```

### 3. GET /api/users/shareable

```typescript
export async function getShareableUsers(req: Request, res: Response) {
  try {
    const { skip = 0, take = 30, search } = req.query as any;
    const currentUserId = req.user.id;

    let query = `
      SELECT 
        u.id,
        u.name,
        u.username,
        u.avatar,
        EXISTS(
          SELECT 1 FROM user_follows 
          WHERE follower_id = $1 AND followed_id = u.id
        ) as is_following
      FROM users u
      WHERE u.id != $1
    `;

    const params: any[] = [currentUserId];

    // Busca
    if (search && search.trim().length > 0) {
      query += ` 
        AND (
          LOWER(UNACCENT(u.name)) LIKE LOWER(UNACCENT($${params.length + 1}))
          OR LOWER(UNACCENT(u.username)) LIKE LOWER(UNACCENT($${params.length + 1}))
        )
      `;
      params.push(`%${search}%`);
    }

    // Ordenar por seguidores primeiro
    query += ` ORDER BY is_following DESC, u.name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(take, skip);

    const users = await db.query(query, params);

    return res.json({
      total: users.rows.length,
      records: users.rows,
    });
  } catch (error) {
    console.error('Error fetching shareable users:', error);
    return res.status(500).json({
      status: 500,
      message: 'Erro ao buscar usuários',
    });
  }
}
```

---

## Request 8: Planos de Assinatura

### 1. POST /api/products (com validações)

```typescript
// src/controllers/ProductController.ts

export async function createProduct(req: Request, res: Response) {
  try {
    const userId = req.user.id;
    const { name, description, link, value } = req.body;

    // 1. Buscar usuário com plano e contadores
    const userResult = await db.query(
      `SELECT 
        u.id,
        u.total_products_created,
        u.active_products_count,
        p.name as plan_name,
        p.max_marketplace_items,
        p.max_total_products_created
      FROM users u
      INNER JOIN plans p ON p.id = u.plan_id
      WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'Usuário não encontrado',
      });
    }

    const user = userResult.rows[0];

    // 2. VALIDAÇÃO: Limite de produtos ATIVOS
    if (
      user.active_products_count >= user.max_marketplace_items &&
      user.max_marketplace_items !== 9999
    ) {
      return res.status(400).json({
        code: 'LIMIT_ACTIVE_PRODUCTS',
        message: `Você atingiu o limite de ${user.max_marketplace_items} anúncios ativos no plano ${user.plan_name}.`,
        limit: user.max_marketplace_items,
        current: user.active_products_count,
        requires_upgrade: true,
      });
    }

    // 3. VALIDAÇÃO: Limite de produtos CRIADOS (total)
    if (
      user.total_products_created >= user.max_total_products_created &&
      user.max_total_products_created !== 9999
    ) {
      return res.status(400).json({
        code: 'LIMIT_TOTAL_CREATED',
        message: `Você atingiu o limite de ${user.max_total_products_created} anúncios criados no plano ${user.plan_name}. Faça upgrade para continuar.`,
        limit: user.max_total_products_created,
        current: user.total_products_created,
        requires_upgrade: true,
      });
    }

    // 4. Criar produto
    await db.query('BEGIN');

    try {
      const productResult = await db.query(
        `INSERT INTO products 
         (user_id, name, description, link, value, created_at, last_edit_date)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [userId, name, description, link, value]
      );

      const product = productResult.rows[0];

      // 5. Salvar mídias (assumindo que vêm em req.files ou req.body.files)
      // Este código depende de como o upload está configurado
      // Exemplo usando multer ou similar:
      /*
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await db.query(
            `INSERT INTO product_medias (product_id, type, uri)
             VALUES ($1, $2, $3)`,
            [product.id, file.mimetype.includes('video') ? 2 : 1, file.url]
          );
        }
      }
      */

      // 6. Incrementar contadores do usuário
      await db.query(
        `UPDATE users 
         SET total_products_created = total_products_created + 1,
             active_products_count = active_products_count + 1
         WHERE id = $1`,
        [userId]
      );

      await db.query('COMMIT');

      return res.status(201).json(product);
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({
      status: 500,
      message: 'Erro ao criar produto',
    });
  }
}
```

### 2. PUT /api/products/:id (com validação de cooldown)

```typescript
export async function updateProduct(req: Request, res: Response) {
  try {
    const { id: productId } = req.params;
    const userId = req.user.id;
    const { name, description, link, value } = req.body;

    // 1. Buscar produto
    const productResult = await db.query(
      'SELECT * FROM products WHERE id = $1 AND user_id = $2',
      [productId, userId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Produto não encontrado',
      });
    }

    const product = productResult.rows[0];

    // 2. Buscar plano do usuário
    const userResult = await db.query(
      `SELECT 
        p.name as plan_name,
        p.edit_cooldown_months,
        p.can_edit_anytime
      FROM users u
      INNER JOIN plans p ON p.id = u.plan_id
      WHERE u.id = $1`,
      [userId]
    );

    const user = userResult.rows[0];

    // 3. VALIDAÇÃO: Cooldown de edição
    if (!user.can_edit_anytime && user.edit_cooldown_months > 0) {
      if (product.last_edit_date) {
        const lastEditDate = new Date(product.last_edit_date);
        const now = new Date();
        
        // Calcular próxima data permitida
        const nextAllowedEdit = new Date(lastEditDate);
        nextAllowedEdit.setMonth(nextAllowedEdit.getMonth() + user.edit_cooldown_months);

        if (now < nextAllowedEdit) {
          const msRemaining = nextAllowedEdit.getTime() - now.getTime();
          const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

          return res.status(403).json({
            code: 'EDIT_COOLDOWN',
            message: `Você só pode editar este anúncio a cada ${user.edit_cooldown_months} meses. Próxima edição permitida em ${nextAllowedEdit.toLocaleDateString('pt-BR')}.`,
            next_edit_date: nextAllowedEdit.toISOString(),
            days_remaining: daysRemaining,
            cooldown_months: user.edit_cooldown_months,
          });
        }
      }
    }

    // 4. Atualizar produto
    const updatedProduct = await db.query(
      `UPDATE products 
       SET name = $1,
           description = $2,
           link = $3,
           value = $4,
           last_edit_date = NOW(),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, description, link, value, productId]
    );

    return res.json(updatedProduct.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({
      status: 500,
      message: 'Erro ao atualizar produto',
    });
  }
}
```

### 3. DELETE /api/products/:id

```typescript
export async function deleteProduct(req: Request, res: Response) {
  try {
    const { id: productId } = req.params;
    const userId = req.user.id;

    // 1. Verificar se produto existe e pertence ao usuário
    const productResult = await db.query(
      'SELECT id FROM products WHERE id = $1 AND user_id = $2',
      [productId, userId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Produto não encontrado',
      });
    }

    await db.query('BEGIN');

    try {
      // 2. Deletar produto
      await db.query('DELETE FROM products WHERE id = $1', [productId]);

      // 3. Decrementar contador de produtos ATIVOS
      await db.query(
        `UPDATE users 
         SET active_products_count = GREATEST(0, active_products_count - 1)
         WHERE id = $1`,
        [userId]
      );

      // NÃO decrementar total_products_created (é cumulativo)

      await db.query('COMMIT');

      return res.json({
        success: true,
        message: 'Produto deletado com sucesso',
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({
      status: 500,
      message: 'Erro ao deletar produto',
    });
  }
}
```

### 4. GET /api/users/me (com novos campos)

```typescript
export async function getMe(req: Request, res: Response) {
  try {
    const userId = req.user.id;

    const userResult = await db.query(
      `SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.avatar,
        u.bio,
        u.pv,
        u.total_products_created,
        u.active_products_count,
        ut.name as user_type_name,
        p.id as plan_id,
        p.name as plan_name,
        p.value as plan_value,
        p.max_marketplace_items,
        p.max_marketplace_updates,
        p.edit_cooldown_months,
        p.max_total_products_created,
        p.can_edit_anytime,
        p.created_at as plan_created_at,
        p.updated_at as plan_updated_at
      FROM users u
      LEFT JOIN user_types ut ON ut.id = u.user_type_id
      INNER JOIN plans p ON p.id = u.plan_id
      WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'Usuário não encontrado',
      });
    }

    const user = userResult.rows[0];

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      bio: user.bio,
      pv: user.pv,
      total_products_created: user.total_products_created,
      active_products_count: user.active_products_count,
      user_type: {
        name: user.user_type_name,
      },
      plan: {
        id: user.plan_id,
        name: user.plan_name,
        value: user.plan_value,
        max_marketplace_items: user.max_marketplace_items,
        max_marketplace_updates: user.max_marketplace_updates,
        edit_cooldown_months: user.edit_cooldown_months,
        max_total_products_created: user.max_total_products_created,
        can_edit_anytime: user.can_edit_anytime,
        created_at: user.plan_created_at,
        updated_at: user.plan_updated_at,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({
      status: 500,
      message: 'Erro ao buscar dados do usuário',
    });
  }
}
```

---

## Tratamento de Erros

### Middleware de Erro Global

```typescript
// src/middlewares/errorHandler.ts

import { Request, Response, NextFunction } from 'express';

interface ApiError extends Error {
  code?: string;
  status?: number;
  limit?: number;
  current?: number;
  requires_upgrade?: boolean;
  next_edit_date?: string;
  days_remaining?: number;
  cooldown_months?: number;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('API Error:', err);

  // Erros customizados
  if (err.code) {
    const status = err.status || 400;

    return res.status(status).json({
      code: err.code,
      message: err.message,
      ...(err.limit && { limit: err.limit }),
      ...(err.current && { current: err.current }),
      ...(err.requires_upgrade && { requires_upgrade: err.requires_upgrade }),
      ...(err.next_edit_date && { next_edit_date: err.next_edit_date }),
      ...(err.days_remaining && { days_remaining: err.days_remaining }),
      ...(err.cooldown_months && { cooldown_months: err.cooldown_months }),
    });
  }

  // Erro genérico
  return res.status(500).json({
    status: 500,
    message: 'Erro interno do servidor',
  });
}
```

### Códigos de Erro Padronizados

```typescript
// src/errors/codes.ts

export const ErrorCodes = {
  // Request 2 - Busca
  INVALID_SEARCH_TERM: 'INVALID_SEARCH_TERM',

  // Request 7 - Compartilhamento
  INVALID_SHARE_METHOD: 'INVALID_SHARE_METHOD',
  POST_NOT_FOUND: 'POST_NOT_FOUND',
  INVALID_USER_IDS: 'INVALID_USER_IDS',
  TOO_MANY_USERS: 'TOO_MANY_USERS',

  // Request 8 - Planos
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  LIMIT_ACTIVE_PRODUCTS: 'LIMIT_ACTIVE_PRODUCTS',
  LIMIT_TOTAL_CREATED: 'LIMIT_TOTAL_CREATED',
  EDIT_COOLDOWN: 'EDIT_COOLDOWN',
};

export function createError(
  code: string,
  message: string,
  metadata?: Record<string, any>
): ApiError {
  const error: ApiError = new Error(message);
  error.code = code;
  Object.assign(error, metadata);
  return error;
}
```

---

## Testes Unitários (Jest)

```typescript
// tests/products.test.ts

import request from 'supertest';
import app from '../src/app';

describe('POST /api/products', () => {
  it('should block Free user on 4th product', async () => {
    const token = 'BEARER_TOKEN_FREE_USER_WITH_3_PRODUCTS';

    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Produto 4',
        description: 'Teste',
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('LIMIT_TOTAL_CREATED');
    expect(response.body.limit).toBe(3);
    expect(response.body.current).toBe(3);
    expect(response.body.requires_upgrade).toBe(true);
  });

  it('should allow Premium user unlimited products', async () => {
    const token = 'BEARER_TOKEN_PREMIUM_USER';

    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Produto 999',
        description: 'Teste',
      });

    expect(response.status).toBe(201);
  });
});

describe('PUT /api/products/:id', () => {
  it('should block Pro user before 6 months', async () => {
    const token = 'BEARER_TOKEN_PRO_USER';
    const productId = 'PRODUCT_EDITED_2_MONTHS_AGO';

    const response = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Produto Editado',
      });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('EDIT_COOLDOWN');
    expect(response.body.cooldown_months).toBe(6);
    expect(response.body.days_remaining).toBeGreaterThan(0);
  });

  it('should allow Premium user anytime edit', async () => {
    const token = 'BEARER_TOKEN_PREMIUM_USER';
    const productId = 'ANY_PRODUCT';

    const response = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Produto Editado',
      });

    expect(response.status).toBe(200);
  });
});
```

---

**Fim do documento**
