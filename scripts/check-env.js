// Script para verificar se as variáveis de ambiente estão sendo carregadas
require('dotenv').config({ path: '.env.local' });

console.log('=== Verificação de Variáveis de Ambiente ===\n');

const vars = {
  'DATABASE_URL': process.env.DATABASE_URL,
  'JWT_SECRET': process.env.JWT_SECRET,
  'ASAAS_API_KEY': process.env.ASAAS_API_KEY,
  'ASAAS_ENV': process.env.ASAAS_ENV,
  'NEXT_PUBLIC_APP_URL': process.env.NEXT_PUBLIC_APP_URL,
};

for (const [key, value] of Object.entries(vars)) {
  if (value) {
    const displayValue = key.includes('KEY') || key.includes('SECRET')
      ? `${value.substring(0, 10)}...`
      : value;
    console.log(`✅ ${key}: ${displayValue}`);
  } else {
    console.log(`❌ ${key}: NÃO CONFIGURADA`);
  }
}

console.log('\n=== Fim da Verificação ===');
