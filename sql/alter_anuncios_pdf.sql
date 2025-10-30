-- Adiciona coluna para armazenar o PDF do certificado gerado
-- Isso garante que o certificado seja gerado apenas uma vez e sempre retornado idêntico
ALTER TABLE anuncios
  ADD COLUMN IF NOT EXISTS registro_pdf_data BYTEA;

-- Comentário explicativo
COMMENT ON COLUMN anuncios.registro_pdf_data IS 'Dados binários do PDF do certificado gerado. Armazenado para garantir que o mesmo certificado seja sempre retornado, sem regeneração.';
