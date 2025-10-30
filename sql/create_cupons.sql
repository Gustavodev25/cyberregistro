-- ===================================================
-- CRIAR TABELA DE CUPONS DE DESCONTO
-- ===================================================
-- Execute este script conectado ao banco 'cyberregistro'

-- 1. CRIAR TABELA DE CUPONS
CREATE TABLE IF NOT EXISTS cupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
    max_uses INTEGER, -- NULL = ilimitado
    uses_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP, -- NULL = sem expiração
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CRIAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_cupons_code ON cupons(UPPER(code));
CREATE INDEX IF NOT EXISTS idx_cupons_is_active ON cupons(is_active);
CREATE INDEX IF NOT EXISTS idx_cupons_expires_at ON cupons(expires_at);
CREATE INDEX IF NOT EXISTS idx_cupons_created_at ON cupons(created_at DESC);

-- 3. CRIAR TRIGGER PARA ATUALIZAR O CAMPO updated_at
DROP TRIGGER IF EXISTS trigger_atualizar_timestamp_cupons ON cupons;
CREATE TRIGGER trigger_atualizar_timestamp_cupons
BEFORE UPDATE ON cupons
FOR EACH ROW
EXECUTE FUNCTION atualizar_timestamp();

-- 4. CRIAR TABELA DE USO DE CUPONS (para rastrear quem usou)
CREATE TABLE IF NOT EXISTS cupons_usage (
    id SERIAL PRIMARY KEY,
    cupom_id INTEGER NOT NULL REFERENCES cupons(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
    discount_applied DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. CRIAR ÍNDICES NA TABELA DE USO
CREATE INDEX IF NOT EXISTS idx_cupons_usage_cupom_id ON cupons_usage(cupom_id);
CREATE INDEX IF NOT EXISTS idx_cupons_usage_user_id ON cupons_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_cupons_usage_transaction_id ON cupons_usage(transaction_id);
CREATE INDEX IF NOT EXISTS idx_cupons_usage_used_at ON cupons_usage(used_at DESC);

-- 6. ADICIONAR COMENTÁRIOS
COMMENT ON TABLE cupons IS 'Tabela de cupons de desconto para compra de créditos';
COMMENT ON COLUMN cupons.id IS 'Identificador único do cupom';
COMMENT ON COLUMN cupons.code IS 'Código do cupom (único, case-insensitive)';
COMMENT ON COLUMN cupons.discount_type IS 'Tipo de desconto: percentage (%) ou fixed (R$)';
COMMENT ON COLUMN cupons.discount_value IS 'Valor do desconto (porcentagem ou valor fixo)';
COMMENT ON COLUMN cupons.max_uses IS 'Máximo de usos permitidos (NULL = ilimitado)';
COMMENT ON COLUMN cupons.uses_count IS 'Contador de quantas vezes o cupom foi usado';
COMMENT ON COLUMN cupons.expires_at IS 'Data de expiração do cupom (NULL = sem expiração)';
COMMENT ON COLUMN cupons.is_active IS 'Se o cupom está ativo e pode ser usado';

COMMENT ON TABLE cupons_usage IS 'Tabela de rastreamento de uso de cupons';
COMMENT ON COLUMN cupons_usage.cupom_id IS 'ID do cupom utilizado';
COMMENT ON COLUMN cupons_usage.user_id IS 'ID do usuário que usou o cupom';
COMMENT ON COLUMN cupons_usage.transaction_id IS 'ID da transação associada';
COMMENT ON COLUMN cupons_usage.discount_applied IS 'Valor do desconto aplicado em reais';
COMMENT ON COLUMN cupons_usage.used_at IS 'Data e hora do uso do cupom';

-- 7. VERIFICAR ESTRUTURA
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'cupons'
ORDER BY ordinal_position;

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Tabela de cupons criada com sucesso!';
END $$;
