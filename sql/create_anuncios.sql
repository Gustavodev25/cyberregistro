-- Tabela para armazenar anúncios sincronizados do Mercado Livre
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
    -- Campos de controle do ambiente de registro
    registro_enviado BOOLEAN DEFAULT FALSE,
    registro_enviado_em TIMESTAMP,
    registro_status VARCHAR(50),
    registro_gerado_em TIMESTAMP,
    registro_hash TEXT,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ml_account_id, mlb_code),
    CONSTRAINT fk_user
        FOREIGN KEY(user_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_ml_account
        FOREIGN KEY(ml_account_id)
        REFERENCES mercadolivre_accounts(id)
        ON DELETE CASCADE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_anuncios_user_id ON anuncios(user_id);
CREATE INDEX IF NOT EXISTS idx_anuncios_ml_account_id ON anuncios(ml_account_id);
CREATE INDEX IF NOT EXISTS idx_anuncios_mlb_code ON anuncios(mlb_code);
CREATE INDEX IF NOT EXISTS idx_anuncios_status ON anuncios(status);
CREATE INDEX IF NOT EXISTS idx_anuncios_registro_status ON anuncios(registro_status);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_anuncios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_anuncios_updated_at
    BEFORE UPDATE ON anuncios
    FOR EACH ROW
    EXECUTE FUNCTION update_anuncios_updated_at();
