-- Adiciona campos de controle do ambiente de registro aos anuncios (se não existirem)
ALTER TABLE anuncios
  ADD COLUMN IF NOT EXISTS registro_enviado BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS registro_enviado_em TIMESTAMP,
  ADD COLUMN IF NOT EXISTS registro_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS registro_gerado_em TIMESTAMP,
  ADD COLUMN IF NOT EXISTS registro_hash TEXT;

-- Índice auxiliar para status de registro
CREATE INDEX IF NOT EXISTS idx_anuncios_registro_status ON anuncios(registro_status);

