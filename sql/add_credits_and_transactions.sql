-- ===================================================
-- ADICIONAR SUPORTE A CRÉDITOS E TRANSAÇÕES
-- ===================================================
-- Execute este script conectado ao banco 'cyberregistro'

-- 1. ADICIONAR COLUNA DE CRÉDITOS NA TABELA USUARIOS
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;

COMMENT ON COLUMN usuarios.credits IS 'Quantidade de créditos disponíveis do usuário';

-- 2. CRIAR TABELA DE TRANSAÇÕES
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

-- 3. CRIAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_id ON transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- 4. CRIAR TRIGGER PARA ATUALIZAR O CAMPO updated_at
DROP TRIGGER IF EXISTS trigger_atualizar_timestamp_transactions ON transactions;
CREATE TRIGGER trigger_atualizar_timestamp_transactions
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION atualizar_timestamp();

-- 5. ADICIONAR COMENTÁRIOS
COMMENT ON TABLE transactions IS 'Tabela de transações de créditos';
COMMENT ON COLUMN transactions.id IS 'Identificador único da transação';
COMMENT ON COLUMN transactions.user_id IS 'ID do usuário que realizou a transação';
COMMENT ON COLUMN transactions.type IS 'Tipo da transação: credit_purchase, credit_usage, refund';
COMMENT ON COLUMN transactions.amount IS 'Valor em reais da transação';
COMMENT ON COLUMN transactions.credits_quantity IS 'Quantidade de créditos (positivo=compra, negativo=uso)';
COMMENT ON COLUMN transactions.payment_method IS 'Método de pagamento utilizado';
COMMENT ON COLUMN transactions.payment_id IS 'ID do pagamento no gateway (Asaas)';
COMMENT ON COLUMN transactions.status IS 'Status da transação: pending, completed, failed, refunded';
COMMENT ON COLUMN transactions.description IS 'Descrição adicional da transação';

-- 6. VERIFICAR ESTRUTURA
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'transactions'
ORDER BY ordinal_position;

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Tabelas de créditos e transações criadas com sucesso!';
END $$;
