-- Tabela para armazenar contas conectadas do Mercado Livre
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
    CONSTRAINT fk_user
        FOREIGN KEY(user_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_ml_accounts_user_id ON mercadolivre_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_accounts_ml_user_id ON mercadolivre_accounts(ml_user_id);
CREATE INDEX IF NOT EXISTS idx_ml_accounts_expires_at ON mercadolivre_accounts(expires_at);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_mercadolivre_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mercadolivre_accounts_updated_at
    BEFORE UPDATE ON mercadolivre_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_mercadolivre_accounts_updated_at();
