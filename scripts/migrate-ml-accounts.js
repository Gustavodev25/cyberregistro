const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Gustavo2501@localhost:5432/cyberregistro'
});

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, '..', 'sql', 'create_mercadolivre_accounts.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔄 Executando migração da tabela mercadolivre_accounts...');

    await pool.query(sql);

    console.log('✅ Migração executada com sucesso!');
    console.log('📊 Tabela mercadolivre_accounts criada.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error);
    process.exit(1);
  }
}

runMigration();
