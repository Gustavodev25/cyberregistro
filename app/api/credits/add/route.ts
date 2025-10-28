import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body?.userId;
    const amount = body?.amount || 10;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    // Iniciar transação
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Buscar saldo atual
      const userResult = await client.query(
        'SELECT credits FROM usuarios WHERE id = $1 FOR UPDATE',
        [userId]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Usuário não encontrado' },
          { status: 404 }
        );
      }

      const currentCredits = userResult.rows[0].credits || 0;

      // Adicionar créditos
      const newBalance = currentCredits + amount;
      await client.query(
        'UPDATE usuarios SET credits = $1 WHERE id = $2',
        [newBalance, userId]
      );

      // Registrar transação
      await client.query(
        `INSERT INTO transactions (user_id, type, credits_quantity, description, status)
         VALUES ($1, 'credit_purchase', $2, $3, 'completed')`,
        [userId, amount, `Adição manual de ${amount} créditos`]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        previousBalance: currentCredits,
        newBalance,
        added: amount
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao adicionar créditos:', error);
    return NextResponse.json(
      { error: 'Erro interno ao adicionar créditos' },
      { status: 500 }
    );
  }
}
