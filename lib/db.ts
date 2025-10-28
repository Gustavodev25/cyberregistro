import { Pool } from 'pg';

// Configuração do pool de conexões PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cyberregistro',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // número máximo de clientes no pool
  idleTimeoutMillis: 30000, // quanto tempo um cliente pode ficar ocioso antes de ser fechado
  connectionTimeoutMillis: 2000, // quanto tempo esperar ao conectar
});

// Função para testar a conexão
export async function testarConexao() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('Conexão com PostgreSQL estabelecida:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('Erro ao conectar com PostgreSQL:', error);
    return false;
  }
}

// Função auxiliar para executar queries
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executada:', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Erro ao executar query:', error);
    throw error;
  }
}

// Função para obter um cliente do pool (para transações)
export async function getClient() {
  const client = await pool.connect();
  return client;
}

// Exportar o pool para uso direto se necessário
export default pool;
