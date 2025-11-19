-- ===================================================
-- SCHEMA COMPLETO DO BANCO DE DADOS CYBERREGISTRO
-- ===================================================
-- Execute este script no pgAdmin para criar todas as tabelas
-- Database: cyberregistro

-- ===================================================
-- 1. FUNÇÃO AUXILIAR PARA ATUALIZAR TIMESTAMPS
-- ===================================================
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===================================================
-- 2. TABELA DE USUÁRIOS
-- ===================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha TEXT NOT NULL,
    credits INTEGER DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_login TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices da tabela usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_criado_em ON usuarios(criado_em DESC);

-- Comentários
COMMENT ON TABLE usuarios IS 'Tabela de usuários do sistema';
COMMENT ON COLUMN usuarios.credits IS 'Quantidade de créditos disponíveis do usuário';

-- ===================================================
-- 3. TABELA DE CONTAS DO MERCADO LIVRE
-- ===================================================
CREATE TABLE IF NOT EXISTS mercadolivre_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    ml_user_id BIGINT NOT NULL,
    nickname VARCHAR(255),
    email VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    country_id VARCHAR(10),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    scope TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, ml_user_id),
    CONSTRAINT fk_ml_accounts_user
        FOREIGN KEY(user_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
);

-- Índices da tabela mercadolivre_accounts
CREATE INDEX IF NOT EXISTS idx_ml_accounts_user_id ON mercadolivre_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_accounts_ml_user_id ON mercadolivre_accounts(ml_user_id);
CREATE INDEX IF NOT EXISTS idx_ml_accounts_expires_at ON mercadolivre_accounts(expires_at);

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_update_mercadolivre_accounts_updated_at
    BEFORE UPDATE ON mercadolivre_accounts
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp();

-- Comentários
COMMENT ON TABLE mercadolivre_accounts IS 'Contas conectadas do Mercado Livre';

-- ===================================================
-- 4. TABELA DE ANÚNCIOS
-- ===================================================
CREATE TABLE IF NOT EXISTS anuncios (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    ml_account_id INTEGER NOT NULL,
    mlb_code VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    thumbnail VARCHAR(500),
    price DECIMAL(10, 2),
    available_quantity INTEGER,
    sold_quantity INTEGER,
    status VARCHAR(50),
    permalink VARCHAR(500),
    listing_type_id VARCHAR(50),
    condition VARCHAR(50),
    created_at_ml TIMESTAMP,
    updated_at_ml TIMESTAMP,
    sku TEXT,
    -- Campos de controle do ambiente de registro
    registro_enviado BOOLEAN DEFAULT FALSE,
    registro_enviado_em TIMESTAMP,
    registro_status VARCHAR(50),
    registro_gerado_em TIMESTAMP,
    registro_hash TEXT,
    registro_pdf_data BYTEA,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ml_account_id, mlb_code),
    CONSTRAINT fk_anuncios_user
        FOREIGN KEY(user_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_anuncios_ml_account
        FOREIGN KEY(ml_account_id)
        REFERENCES mercadolivre_accounts(id)
        ON DELETE CASCADE
);

-- Índices da tabela anuncios
CREATE INDEX IF NOT EXISTS idx_anuncios_user_id ON anuncios(user_id);
CREATE INDEX IF NOT EXISTS idx_anuncios_ml_account_id ON anuncios(ml_account_id);
CREATE INDEX IF NOT EXISTS idx_anuncios_mlb_code ON anuncios(mlb_code);
CREATE INDEX IF NOT EXISTS idx_anuncios_status ON anuncios(status);
CREATE INDEX IF NOT EXISTS idx_anuncios_registro_status ON anuncios(registro_status);
CREATE INDEX IF NOT EXISTS idx_anuncios_sku ON anuncios(sku);

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_update_anuncios_updated_at
    BEFORE UPDATE ON anuncios
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp();

-- Comentários
COMMENT ON TABLE anuncios IS 'Anúncios sincronizados do Mercado Livre';
COMMENT ON COLUMN anuncios.sku IS 'SKU do produto para busca';
COMMENT ON COLUMN anuncios.registro_pdf_data IS 'Dados binários do PDF do certificado gerado';

-- ===================================================
-- 5. TABELA DE TRANSAÇÕES
-- ===================================================
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'credit_purchase', 'credit_usage', 'refund'
    amount DECIMAL(10, 2), -- Valor em reais (pode ser NULL para transações sem valor monetário)
    credits_quantity INTEGER NOT NULL, -- Quantidade de créditos (positivo para compra, negativo para uso)
    payment_method VARCHAR(50), -- 'PIX', 'CREDIT_CARD', NULL
    payment_id VARCHAR(255), -- ID do pagamento no Asaas
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    description TEXT, -- Descrição da transação
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices da tabela transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_id ON transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_atualizar_timestamp_transactions
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp();

-- Comentários
COMMENT ON TABLE transactions IS 'Tabela de transações de créditos';
COMMENT ON COLUMN transactions.type IS 'Tipo da transação: credit_purchase, credit_usage, refund';
COMMENT ON COLUMN transactions.amount IS 'Valor em reais da transação';
COMMENT ON COLUMN transactions.credits_quantity IS 'Quantidade de créditos (positivo=compra, negativo=uso)';
COMMENT ON COLUMN transactions.payment_method IS 'Método de pagamento utilizado';
COMMENT ON COLUMN transactions.payment_id IS 'ID do pagamento no gateway (Asaas)';
COMMENT ON COLUMN transactions.status IS 'Status da transação: pending, completed, failed, refunded';

-- ===================================================
-- 6. TABELA DE CUPONS
-- ===================================================
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

-- Índices da tabela cupons
CREATE INDEX IF NOT EXISTS idx_cupons_code ON cupons(UPPER(code));
CREATE INDEX IF NOT EXISTS idx_cupons_is_active ON cupons(is_active);
CREATE INDEX IF NOT EXISTS idx_cupons_expires_at ON cupons(expires_at);
CREATE INDEX IF NOT EXISTS idx_cupons_created_at ON cupons(created_at DESC);

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_atualizar_timestamp_cupons
    BEFORE UPDATE ON cupons
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp();

-- Comentários
COMMENT ON TABLE cupons IS 'Tabela de cupons de desconto para compra de créditos';
COMMENT ON COLUMN cupons.code IS 'Código do cupom (único, case-insensitive)';
COMMENT ON COLUMN cupons.discount_type IS 'Tipo de desconto: percentage (%) ou fixed (R$)';
COMMENT ON COLUMN cupons.discount_value IS 'Valor do desconto (porcentagem ou valor fixo)';
COMMENT ON COLUMN cupons.max_uses IS 'Máximo de usos permitidos (NULL = ilimitado)';
COMMENT ON COLUMN cupons.uses_count IS 'Contador de quantas vezes o cupom foi usado';
COMMENT ON COLUMN cupons.expires_at IS 'Data de expiração do cupom (NULL = sem expiração)';
COMMENT ON COLUMN cupons.is_active IS 'Se o cupom está ativo e pode ser usado';

-- ===================================================
-- 7. TABELA DE USO DE CUPONS
-- ===================================================
CREATE TABLE IF NOT EXISTS cupons_usage (
    id SERIAL PRIMARY KEY,
    cupom_id INTEGER NOT NULL REFERENCES cupons(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
    discount_applied DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices da tabela cupons_usage
CREATE INDEX IF NOT EXISTS idx_cupons_usage_cupom_id ON cupons_usage(cupom_id);
CREATE INDEX IF NOT EXISTS idx_cupons_usage_user_id ON cupons_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_cupons_usage_transaction_id ON cupons_usage(transaction_id);
CREATE INDEX IF NOT EXISTS idx_cupons_usage_used_at ON cupons_usage(used_at DESC);

-- Comentários
COMMENT ON TABLE cupons_usage IS 'Tabela de rastreamento de uso de cupons';
COMMENT ON COLUMN cupons_usage.cupom_id IS 'ID do cupom utilizado';
COMMENT ON COLUMN cupons_usage.user_id IS 'ID do usuário que usou o cupom';
COMMENT ON COLUMN cupons_usage.transaction_id IS 'ID da transação associada';
COMMENT ON COLUMN cupons_usage.discount_applied IS 'Valor do desconto aplicado em reais';
COMMENT ON COLUMN cupons_usage.used_at IS 'Data e hora do uso do cupom';

-- ===================================================
-- 8. MENSAGEM DE SUCESSO
-- ===================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Schema do CyberRegistro criado com sucesso!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tabelas criadas:';
    RAISE NOTICE '  1. usuarios';
    RAISE NOTICE '  2. mercadolivre_accounts';
    RAISE NOTICE '  3. anuncios';
    RAISE NOTICE '  4. transactions';
    RAISE NOTICE '  5. cupons';
    RAISE NOTICE '  6. cupons_usage';
    RAISE NOTICE '========================================';
END $$;
