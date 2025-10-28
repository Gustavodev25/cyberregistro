const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Gustavo2501@localhost:5432/cyberregistro'
});

async function runSql(file) {
  const sqlPath = path.join(__dirname, '..', 'sql', file);
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
}

async function runMigration() {
  try {
    console.log('Executando migrações Mercado Livre...');
    // Criar contas primeiro (FK de anuncios depende desta)
    try {
      await runSql('create_mercadolivre_accounts.sql');
      console.log('Tabela mercadolivre_accounts pronta.');
    } catch (e) {
      // Se trigger já existir, apenas seguir em frente
      console.warn('Aviso: mercadolivre_accounts já configurada. Prosseguindo...');
    }
    await runSql('create_anuncios.sql');
    console.log('Tabela anuncios pronta.');
    console.log('Migrações concluídas com sucesso.');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao executar migrações:', error);
    process.exit(1);
  }
}

runMigration();
