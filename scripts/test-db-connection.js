require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'cyberregistro',
});

console.log('Tentando conectar com:');
console.log(`Host: ${process.env.DB_HOST}`);
console.log(`Port: ${process.env.DB_PORT}`);
console.log(`User: ${process.env.DB_USER}`);
console.log(`Database: ${process.env.DB_NAME}`);

async function test() {
  try {
    await client.connect();
    console.log('✅ Conexão bem sucedida!');
    const res = await client.query('SELECT NOW()');
    console.log('🕒 Data do banco:', res.rows[0].now);
    await client.end();
  } catch (err) {
    console.error('❌ Falha na conexão:', err.message);
  }
}

test();
