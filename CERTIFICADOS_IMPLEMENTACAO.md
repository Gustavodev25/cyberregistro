# Implementação: Armazenamento e Exibição de Certificados

## Problema Resolvido

Anteriormente, o botão "Baixar" no módulo de Certificados **regenerava** um novo certificado a cada clique, resultando em:
- Hash diferente a cada download
- Timestamp diferente a cada download
- PDF com conteúdo diferente (mesmo que visualmente similar)

Isso violava o princípio de imutabilidade dos certificados e tornava impossível verificar a autenticidade do documento.

## Solução Implementada

### 1. Armazenamento no Banco de Dados

**Arquivo**: `sql/alter_anuncios_pdf.sql`

Adicionada coluna `registro_pdf_data` (tipo BYTEA) na tabela `anuncios` para armazenar os bytes do PDF gerado.

**Executar migração**:
```bash
node scripts/migrate-anuncios-pdf.js
```

### 2. Nova API de Geração

**Arquivo**: `app/api/certificados/generate/route.ts`

- Endpoint: `POST /api/certificados/generate`
- Gera o certificado **apenas uma vez**
- Armazena o PDF no banco de dados
- Retorna erro 409 (Conflict) se tentar gerar novamente
- Calcula hash e timestamp fixos no momento da geração

### 3. Nova API de Download

**Arquivo**: `app/api/certificados/download/route.ts`

- Endpoint: `GET /api/certificados/download?id=<anuncioId>`
- Retorna o PDF armazenado diretamente do banco
- **Nunca regenera** o certificado
- Cache agressivo (immutable) - navegador não precisa baixar novamente

### 4. Versão Server-Side do Gerador

**Arquivo**: `app/utils/registroCertificateServer.ts`

- Versão do gerador que roda no servidor (não no browser)
- Retorna `{ pdfBytes, hash, timestamp }` em vez de fazer download
- Usa fetch absoluto para carregar recursos (logo, QR code)
- Idêntico ao cliente em termos de layout e conteúdo

### 5. Atualização da API de Histórico

**Arquivo**: `app/api/registro/history/route.ts`

- Adicionado campo `has_pdf` (boolean) na resposta
- Indica se o certificado já foi gerado e está armazenado

### 6. Atualização da Página de Certificados

**Arquivo**: `app/certificados/page.tsx`

**Mudanças**:
- Interface `CertItem` agora inclui `has_pdf: boolean`
- Função `handleDownload` modificada:
  1. Se `has_pdf` for `false`, chama API de geração primeiro
  2. Depois, sempre chama API de download para baixar o PDF armazenado
- Removida dependência de `generateRegistroCertificatePDF` (client-side)

## Fluxo de Funcionamento

### Primeiro Clique no Botão "Baixar"

```
1. Usuário clica em "Baixar"
2. Frontend verifica: has_pdf = false
3. Frontend chama: POST /api/certificados/generate
4. Backend gera PDF com timestamp/hash fixos
5. Backend armazena PDF no banco (registro_pdf_data)
6. Frontend chama: GET /api/certificados/download
7. Backend retorna PDF armazenado
8. Navegador baixa o arquivo
```

### Cliques Subsequentes

```
1. Usuário clica em "Baixar" novamente
2. Frontend verifica: has_pdf = true
3. Frontend chama: GET /api/certificados/download
4. Backend retorna PDF armazenado (MESMO arquivo)
5. Navegador baixa o arquivo idêntico
```

## Validação de Imutabilidade

### Teste Manual

1. Acesse a página de Certificados
2. Escolha um anúncio e clique em "Baixar"
3. Salve o arquivo (ex: `certificado-1.pdf`)
4. Clique em "Baixar" novamente
5. Salve o arquivo (ex: `certificado-2.pdf`)

### Verificação no Terminal

```bash
# Windows (PowerShell)
Get-FileHash certificado-1.pdf -Algorithm SHA256
Get-FileHash certificado-2.pdf -Algorithm SHA256

# Linux/Mac
sha256sum certificado-1.pdf
sha256sum certificado-2.pdf
```

**Resultado Esperado**: Os hashes devem ser **IDÊNTICOS**.

### Verificação do Tamanho

```bash
# Windows (PowerShell)
(Get-Item certificado-1.pdf).length
(Get-Item certificado-2.pdf).length

# Linux/Mac
ls -lh certificado-1.pdf certificado-2.pdf
```

**Resultado Esperado**: Tamanhos devem ser **IDÊNTICOS** (byte a byte).

## Arquivos Criados/Modificados

### Criados

- ✅ `sql/alter_anuncios_pdf.sql` - Migração do banco
- ✅ `scripts/migrate-anuncios-pdf.js` - Script de migração
- ✅ `app/api/certificados/download/route.ts` - API de download
- ✅ `app/api/certificados/generate/route.ts` - API de geração
- ✅ `app/utils/registroCertificateServer.ts` - Gerador server-side

### Modificados

- ✅ `app/api/registro/history/route.ts` - Adiciona flag `has_pdf`
- ✅ `app/certificados/page.tsx` - Nova lógica de download
- ✅ `app/api/cupons/[id]/route.ts` - Corrigido tipo params para Next.js 16

## Benefícios da Implementação

1. **Imutabilidade**: Certificado gerado uma vez, nunca mais modificado
2. **Verificabilidade**: Hash e timestamp consistentes para validação
3. **Performance**: Download direto do banco, sem regeneração
4. **Cache Eficiente**: Navegador pode cachear indefinidamente
5. **Integridade**: Impossível gerar certificado diferente para o mesmo anúncio
6. **Rastreabilidade**: Banco de dados guarda evidência do certificado original

## Considerações de Produção

### Armazenamento

- PDFs armazenados como BYTEA no PostgreSQL
- Tamanho médio: ~150-300 KB por certificado
- Para 10.000 certificados: ~1.5-3 GB de armazenamento

### Alternativas Futuras (se necessário)

Se o volume crescer muito, considere:
- Mover para object storage (AWS S3, Cloudflare R2, Vercel Blob)
- Manter hash/timestamp no banco, PDF no storage externo
- Implementar compressão antes de armazenar

### Monitoramento

Verificar periodicamente:
```sql
-- Tamanho total dos PDFs armazenados
SELECT pg_size_pretty(SUM(pg_column_size(registro_pdf_data)))
FROM anuncios
WHERE registro_pdf_data IS NOT NULL;

-- Quantidade de certificados gerados
SELECT COUNT(*)
FROM anuncios
WHERE registro_pdf_data IS NOT NULL;
```

## Testes de Aceitação

- [ ] Gerar certificado pela primeira vez
- [ ] Baixar certificado gerado
- [ ] Baixar certificado novamente (validar hash idêntico)
- [ ] Tentar gerar certificado existente (deve retornar erro 409)
- [ ] Verificar que hash/timestamp não mudam entre downloads
- [ ] Verificar que tamanho do arquivo é idêntico
- [ ] Validar que QR code aponta para mesma URL
- [ ] Confirmar que data de geração permanece a mesma

## Notas Técnicas

### Por que BYTEA?

PostgreSQL oferece tipo `BYTEA` otimizado para dados binários:
- Mais eficiente que Base64
- Suporta indexação
- Compressão automática (TOAST)
- Transações ACID garantem integridade

### Por que não usar file system?

- Dificulta deploy em ambientes serverless (Vercel)
- Requer gerenciamento de arquivos e limpeza
- Problemas de concorrência e sincronização
- Banco garante atomicidade da operação

### Next.js 16 - Mudança de API

Nota: Os `params` em route handlers agora são `Promise`:
```typescript
// Antes (Next.js 15)
export async function GET(req, { params }: { params: { id: string } })

// Agora (Next.js 16)
export async function GET(req, { params }: { params: Promise<{ id: string }> })
```

Sempre fazer `await params` antes de acessar propriedades.
