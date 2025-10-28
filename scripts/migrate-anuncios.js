const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Gustavo2501@localhost:5432/cyberregistro'
});

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, '..', 'sql', 'create_anuncios.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Iniciando migração da tabela anuncios...');

    await pool.query(sql);

    console.log('Migração executada com sucesso!');
    console.log('Tabela anuncios criada/atualizada.');

    process.exit(0);
  } catch (error) {
    console.error('Erro ao executar migração:', error);
    process.exit(1);
  }
}

runMigration();

