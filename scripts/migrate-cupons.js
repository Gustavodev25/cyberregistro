const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Ler variável de ambiente ou usar URL padrão
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL não configurada');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function migrate() {
  try {
    console.log('🔄 Conectando ao banco de dados...');

    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '..', 'sql', 'create_cupons.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('🔄 Executando migração...');

    // Executar SQL
    await pool.query(sql);

    console.log('✅ Migração executada com sucesso!');

    // Verificar se a tabela foi criada
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('cupons', 'cupons_usage')
    `);

    console.log('\n📊 Tabelas criadas:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

  } catch (error) {
    console.error('❌ Erro ao executar migração:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
