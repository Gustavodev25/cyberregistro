import path from 'path';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

// Load env vars with override BEFORE importing db
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

async function migrate() {
  console.log('DEBUG: DB_HOST is:', process.env.DB_HOST);

  // Dynamic import to ensure process.env is populated first
  const { default: pool } = await import('@/lib/db');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check if column exists
    const checkCol = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='cupons' AND column_name='partner_token'
    `);

    if (checkCol.rows.length === 0) {
      console.log('Adding partner_token column...');
      await client.query('ALTER TABLE cupons ADD COLUMN partner_token VARCHAR(100) UNIQUE');
      
      // 2. Backfill existing coupons
      const res = await client.query('SELECT id FROM cupons WHERE partner_token IS NULL');
      console.log(`Found ${res.rows.length} coupons to update.`);
      
      for (const row of res.rows) {
        const token = randomUUID();
        await client.query('UPDATE cupons SET partner_token = $1 WHERE id = $2', [token, row.id]);
      }
      
      console.log('Migration completed successfully.');
    } else {
      console.log('Column partner_token already exists.');
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e);
  } finally {
    client.release();
    // pool.end() might hang if other connections are open, but in a script it's fine
    await pool.end();
  }
}

migrate();