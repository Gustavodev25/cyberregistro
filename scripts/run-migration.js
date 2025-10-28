const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Gustavo2501@localhost:5432/cyberregistro',
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Iniciando migration...');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '..', 'sql', 'add_credits_and_transactions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar o SQL
    await client.query(sql);

    console.log('✅ Migration executada com sucesso!');
    console.log('\nTabelas criadas/atualizadas:');
    console.log('  - usuarios (coluna credits adicionada)');
    console.log('  - transactions (tabela criada)');

    // Verificar se a coluna foi criada
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'usuarios' AND column_name = 'credits'
    `);

    if (result.rows.length > 0) {
      console.log('\n✅ Coluna "credits" verificada na tabela usuarios');
    }

    // Verificar se a tabela transactions foi criada
    const transactionsResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'transactions'
    `);

    if (transactionsResult.rows.length > 0) {
      console.log('✅ Tabela "transactions" verificada');
    }

  } catch (error) {
    console.error('❌ Erro ao executar migration:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n✅ Processo concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro no processo:', error);
    process.exit(1);
  });
