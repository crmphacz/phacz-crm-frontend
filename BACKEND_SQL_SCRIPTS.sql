-- ============================================
-- SCRIPTS SQL - FARMSILO BACKEND
-- Data: 2026-01-23
-- Branch: test-feature
-- ============================================

-- IMPORTANTE: 
-- - Executar em ordem
-- - Fazer backup antes de rodar
-- - Testar em ambiente de desenvolvimento primeiro
-- - Ajustar sintaxe se usar MySQL (comentários incluídos)

-- ============================================
-- REQUEST 2: BUSCA APROXIMADA
-- ============================================

-- 1. Habilitar extensão unaccent (PostgreSQL apenas)
-- MySQL: pular esta etapa, criar função remove_accents (ver abaixo)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Criar índices para busca aproximada (PostgreSQL)
CREATE INDEX IF NOT EXISTS idx_posts_description_lower 
ON posts (LOWER(UNACCENT(description)));

CREATE INDEX IF NOT EXISTS idx_products_name_lower 
ON products (LOWER(UNACCENT(name)));

CREATE INDEX IF NOT EXISTS idx_products_description_lower 
ON products (LOWER(UNACCENT(description)));

CREATE INDEX IF NOT EXISTS idx_users_name_lower 
ON users (LOWER(UNACCENT(name)));

CREATE INDEX IF NOT EXISTS idx_users_username_lower 
ON users (LOWER(UNACCENT(username)));

-- ALTERNATIVA: Índices GIN para full-text search (melhor performance, PostgreSQL)
-- CREATE INDEX idx_posts_description_fulltext ON posts USING GIN (to_tsvector('portuguese', description));
-- CREATE INDEX idx_products_name_fulltext ON products USING GIN (to_tsvector('portuguese', name));
-- CREATE INDEX idx_users_name_fulltext ON users USING GIN (to_tsvector('portuguese', name));

-- MySQL: Função para remover acentos (executar se não tiver UNACCENT)
/*
DELIMITER $$
CREATE FUNCTION IF NOT EXISTS remove_accents(str VARCHAR(255))
RETURNS VARCHAR(255) DETERMINISTIC
BEGIN
  SET str = REPLACE(str, 'á', 'a');
  SET str = REPLACE(str, 'à', 'a');
  SET str = REPLACE(str, 'ã', 'a');
  SET str = REPLACE(str, 'â', 'a');
  SET str = REPLACE(str, 'é', 'e');
  SET str = REPLACE(str, 'è', 'e');
  SET str = REPLACE(str, 'ê', 'e');
  SET str = REPLACE(str, 'í', 'i');
  SET str = REPLACE(str, 'ì', 'i');
  SET str = REPLACE(str, 'î', 'i');
  SET str = REPLACE(str, 'ó', 'o');
  SET str = REPLACE(str, 'ò', 'o');
  SET str = REPLACE(str, 'õ', 'o');
  SET str = REPLACE(str, 'ô', 'o');
  SET str = REPLACE(str, 'ú', 'u');
  SET str = REPLACE(str, 'ù', 'u');
  SET str = REPLACE(str, 'û', 'u');
  SET str = REPLACE(str, 'ç', 'c');
  SET str = REPLACE(str, 'Á', 'A');
  SET str = REPLACE(str, 'À', 'A');
  SET str = REPLACE(str, 'Ã', 'A');
  SET str = REPLACE(str, 'Â', 'A');
  SET str = REPLACE(str, 'É', 'E');
  SET str = REPLACE(str, 'È', 'E');
  SET str = REPLACE(str, 'Ê', 'E');
  SET str = REPLACE(str, 'Í', 'I');
  SET str = REPLACE(str, 'Ì', 'I');
  SET str = REPLACE(str, 'Î', 'I');
  SET str = REPLACE(str, 'Ó', 'O');
  SET str = REPLACE(str, 'Ò', 'O');
  SET str = REPLACE(str, 'Õ', 'O');
  SET str = REPLACE(str, 'Ô', 'O');
  SET str = REPLACE(str, 'Ú', 'U');
  SET str = REPLACE(str, 'Ù', 'U');
  SET str = REPLACE(str, 'Û', 'U');
  SET str = REPLACE(str, 'Ç', 'C');
  RETURN str;
END$$
DELIMITER ;
*/

-- MySQL: Índices funcionais (se a versão suportar, MySQL 8.0+)
/*
CREATE INDEX idx_posts_description_lower ON posts ((LOWER(remove_accents(description))));
CREATE INDEX idx_products_name_lower ON products ((LOWER(remove_accents(name))));
CREATE INDEX idx_users_name_lower ON users ((LOWER(remove_accents(name))));
*/

-- ============================================
-- REQUEST 7: COMPARTILHAMENTO
-- ============================================

-- 1. Criar tabela de analytics de compartilhamento
CREATE TABLE IF NOT EXISTS post_shares (
  id SERIAL PRIMARY KEY,                                    -- PostgreSQL: SERIAL, MySQL: INT AUTO_INCREMENT
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  share_method VARCHAR(20) NOT NULL,                        -- 'whatsapp', 'others', 'internal'
  shared_with_user_id INT NULL,                             -- Apenas para compartilhamento interno
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_post_shares_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_post_shares_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_post_shares_shared_with FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- MySQL: Remover SERIAL e usar INT AUTO_INCREMENT
/*
CREATE TABLE IF NOT EXISTS post_shares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  share_method VARCHAR(20) NOT NULL,
  shared_with_user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE SET NULL
);
*/

-- 2. Criar índices para post_shares
CREATE INDEX IF NOT EXISTS idx_post_shares_post_id ON post_shares(post_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_user_id ON post_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_method ON post_shares(share_method);
CREATE INDEX IF NOT EXISTS idx_post_shares_created_at ON post_shares(created_at);
CREATE INDEX IF NOT EXISTS idx_post_shares_shared_with ON post_shares(shared_with_user_id);

-- 3. Adicionar campo total_shares na tabela posts
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS total_shares INT DEFAULT 0;

-- MySQL: Remover IF NOT EXISTS
-- ALTER TABLE posts ADD COLUMN total_shares INT DEFAULT 0;

-- 4. Criar índice para total_shares
CREATE INDEX IF NOT EXISTS idx_posts_total_shares ON posts(total_shares);

-- 5. Popular contador de compartilhamentos existentes (se houver dados legados)
-- Executar apenas se já existem compartilhamentos no sistema
/*
UPDATE posts p
SET total_shares = (
  SELECT COUNT(*) 
  FROM post_shares ps 
  WHERE ps.post_id = p.id
);
*/

-- ============================================
-- REQUEST 8: PLANOS DE ASSINATURA
-- ============================================

-- 1. Adicionar campos na tabela plans
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS edit_cooldown_months INT DEFAULT 0 COMMENT 'Meses de cooldown para edição (0 = sem restrição)',
ADD COLUMN IF NOT EXISTS max_total_products_created INT DEFAULT 9999 COMMENT 'Limite total de produtos criados (9999 = ilimitado)',
ADD COLUMN IF NOT EXISTS can_edit_anytime BOOLEAN DEFAULT FALSE COMMENT 'Se pode editar anúncios sem cooldown';

-- MySQL: Remover IF NOT EXISTS e COMMENT vira depois da definição
/*
ALTER TABLE plans 
ADD COLUMN edit_cooldown_months INT DEFAULT 0,
ADD COLUMN max_total_products_created INT DEFAULT 9999,
ADD COLUMN can_edit_anytime BOOLEAN DEFAULT FALSE;
*/

-- 2. Atualizar planos existentes com novas regras
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

-- 3. Atualizar preços dos planos
UPDATE plans SET value = '24.90' WHERE name = 'Pro';
UPDATE plans SET value = '39.90' WHERE name = 'Premium';

-- 4. Adicionar campos na tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS total_products_created INT DEFAULT 0 COMMENT 'Contador total de produtos criados (não decrementa)',
ADD COLUMN IF NOT EXISTS active_products_count INT DEFAULT 0 COMMENT 'Produtos ativos no momento (decrementa ao deletar)';

-- MySQL:
/*
ALTER TABLE users 
ADD COLUMN total_products_created INT DEFAULT 0,
ADD COLUMN active_products_count INT DEFAULT 0;
*/

-- 5. Criar índices para users
CREATE INDEX IF NOT EXISTS idx_users_total_products ON users(total_products_created);
CREATE INDEX IF NOT EXISTS idx_users_active_products ON users(active_products_count);

-- 6. Popular contadores existentes (IMPORTANTE: rodar apenas uma vez)
-- ATENÇÃO: Esta query pode demorar em bancos grandes. Testar antes!
UPDATE users u
SET 
  total_products_created = (
    SELECT COUNT(*) 
    FROM products p 
    WHERE p.user_id = u.id
  ),
  active_products_count = (
    SELECT COUNT(*) 
    FROM products p 
    WHERE p.user_id = u.id 
    AND p.deleted_at IS NULL  -- Ajustar se usar soft delete
  );

-- Se não usar soft delete (deleted_at), usar:
/*
UPDATE users u
SET 
  total_products_created = (SELECT COUNT(*) FROM products WHERE user_id = u.id),
  active_products_count = (SELECT COUNT(*) FROM products WHERE user_id = u.id);
*/

-- 7. Adicionar campo na tabela products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS last_edit_date TIMESTAMP NULL COMMENT 'Data da última edição do produto';

-- MySQL:
-- ALTER TABLE products ADD COLUMN last_edit_date TIMESTAMP NULL;

-- 8. Criar índice para last_edit_date
CREATE INDEX IF NOT EXISTS idx_products_last_edit_date ON products(last_edit_date);

-- 9. Inicializar last_edit_date com created_at para produtos existentes
UPDATE products 
SET last_edit_date = created_at 
WHERE last_edit_date IS NULL;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

-- Verificar estrutura da tabela plans
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'plans';

-- Verificar estrutura da tabela users
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users';

-- Verificar estrutura da tabela products
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'products';

-- Verificar estrutura da tabela posts
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'posts';

-- Verificar se tabela post_shares foi criada
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'post_shares';

-- Verificar planos atualizados
SELECT id, name, value, max_marketplace_items, edit_cooldown_months, max_total_products_created, can_edit_anytime 
FROM plans 
ORDER BY value ASC;

-- Verificar contadores de usuários
SELECT 
  COUNT(*) as total_usuarios,
  AVG(total_products_created) as media_criados,
  AVG(active_products_count) as media_ativos,
  MAX(total_products_created) as max_criados
FROM users;

-- Verificar compartilhamentos
SELECT 
  COUNT(*) as total_posts,
  AVG(total_shares) as media_shares,
  MAX(total_shares) as max_shares
FROM posts;

-- ============================================
-- ROLLBACK (em caso de erro)
-- ============================================

-- ATENÇÃO: Usar apenas se algo der errado!

-- Rollback Request 2
/*
DROP INDEX IF EXISTS idx_posts_description_lower;
DROP INDEX IF EXISTS idx_products_name_lower;
DROP INDEX IF EXISTS idx_products_description_lower;
DROP INDEX IF EXISTS idx_users_name_lower;
DROP INDEX IF EXISTS idx_users_username_lower;
DROP EXTENSION IF EXISTS unaccent;
*/

-- Rollback Request 7
/*
DROP TABLE IF EXISTS post_shares;
ALTER TABLE posts DROP COLUMN IF EXISTS total_shares;
*/

-- Rollback Request 8
/*
ALTER TABLE plans DROP COLUMN IF EXISTS edit_cooldown_months;
ALTER TABLE plans DROP COLUMN IF EXISTS max_total_products_created;
ALTER TABLE plans DROP COLUMN IF EXISTS can_edit_anytime;

ALTER TABLE users DROP COLUMN IF EXISTS total_products_created;
ALTER TABLE users DROP COLUMN IF EXISTS active_products_count;

ALTER TABLE products DROP COLUMN IF EXISTS last_edit_date;

-- Reverter preços (se necessário)
UPDATE plans SET value = '14.90' WHERE name = 'Pro';
UPDATE plans SET value = '24.90' WHERE name = 'Premium';
*/

-- ============================================
-- QUERIES ÚTEIS PARA TESTES
-- ============================================

-- Testar busca aproximada (após implementar no backend)
/*
-- Buscar posts com "cafe" (deve encontrar "café")
SELECT * FROM posts 
WHERE LOWER(UNACCENT(description)) LIKE '%' || LOWER(UNACCENT('cafe')) || '%'
LIMIT 10;

-- Buscar produtos com "SILVA" (deve encontrar "silva")
SELECT * FROM products 
WHERE LOWER(UNACCENT(name)) LIKE '%' || LOWER(UNACCENT('SILVA')) || '%'
LIMIT 10;
*/

-- Verificar compartilhamentos
/*
SELECT 
  p.id,
  p.description,
  p.total_shares,
  COUNT(ps.id) as shares_registrados
FROM posts p
LEFT JOIN post_shares ps ON ps.post_id = p.id
GROUP BY p.id, p.description, p.total_shares
HAVING p.total_shares > 0
ORDER BY p.total_shares DESC
LIMIT 10;
*/

-- Verificar usuários próximos do limite
/*
SELECT 
  u.id,
  u.name,
  p.name as plano,
  u.total_products_created,
  p.max_total_products_created,
  u.active_products_count,
  p.max_marketplace_items
FROM users u
INNER JOIN plans p ON p.id = u.plan_id
WHERE u.total_products_created >= (p.max_total_products_created - 2)
   OR u.active_products_count >= (p.max_marketplace_items - 1)
ORDER BY u.total_products_created DESC;
*/

-- Verificar produtos próximos do cooldown
/*
SELECT 
  pr.id,
  pr.name,
  pr.last_edit_date,
  u.name as usuario,
  p.name as plano,
  p.edit_cooldown_months,
  DATE_ADD(pr.last_edit_date, INTERVAL p.edit_cooldown_months MONTH) as proxima_edicao_permitida
FROM products pr
INNER JOIN users u ON u.id = pr.user_id
INNER JOIN plans p ON p.id = u.plan_id
WHERE p.edit_cooldown_months > 0
  AND pr.last_edit_date IS NOT NULL
ORDER BY pr.last_edit_date DESC
LIMIT 20;
*/
