# cyberregistro

Sistema de registro e controle desenvolvido com Next.js.

## Tecnologias

- Next.js
- React
- TypeScript
- Tailwind CSS
- PostgreSQL
- Mercado Livre API
- Asaas Pagamentos

## Instalação

```bash
npm install
```

## Configuração

1. Copie o arquivo `.env.example` para `.env.local`:
```bash
cp .env.example .env.local
```

2. Preencha as variáveis de ambiente no arquivo `.env.local` com suas credenciais.

## Desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador para ver o resultado.

## Deploy na Vercel

### Configuração de Variáveis de Ambiente

Para fazer o deploy na Vercel, você precisa configurar as seguintes variáveis de ambiente:

#### 1. Banco de Dados PostgreSQL
```
DB_HOST=seu_host_postgres
DB_PORT=5432
DB_NAME=cyberregistro
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
```

#### 2. Autenticação
```
JWT_SECRET=sua_chave_secreta_jwt_segura
```

#### 3. Mercado Livre API
```
ML_APP_ID=seu_app_id
ML_CLIENT_SECRET=seu_client_secret
ML_REDIRECT_URI=https://cyberregistro.vercel.app/api/auth/mercadolivre/callback
```

#### 4. Asaas Pagamentos
```
ASAAS_API_KEY=sua_chave_api
ASAAS_ENV=sandbox
```
> **Nota**: Use `sandbox` para testes e `production` para produção

#### 5. URL da Aplicação
```
NEXT_PUBLIC_APP_URL=https://cyberregistro.vercel.app
```

### Passos para Deploy

1. **Conecte seu repositório GitHub à Vercel**:
   - Acesse [vercel.com](https://vercel.com)
   - Importe o repositório `Gustavodev25/cyberregistro`

2. **Configure as variáveis de ambiente**:
   - No painel da Vercel, vá em **Settings** → **Environment Variables**
   - Adicione todas as variáveis listadas acima
   - Certifique-se de que estão configuradas para os ambientes: **Production**, **Preview** e **Development**

3. **Deploy**:
   - Após configurar as variáveis, clique em **Deploy**
   - A Vercel fará o build e deploy automaticamente

### Importante

- ⚠️ Nunca commite arquivos `.env.local` ou `.env` no Git
- 🔒 Mantenha suas chaves de API e senhas seguras
- 🗄️ Configure um banco PostgreSQL (recomendado: [Supabase](https://supabase.com), [Neon](https://neon.tech), ou [Railway](https://railway.app))
- 🔄 Após cada push no GitHub, a Vercel atualizará automaticamente o deploy
