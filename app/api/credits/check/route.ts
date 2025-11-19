import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body?.userId;
    const amount = body?.amount || 1;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar saldo de créditos do usuário
    const result = await pool.query(
      'SELECT credits FROM usuarios WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const currentCredits = result.rows[0].credits || 0;

    if (currentCredits < amount) {
      return NextResponse.json(
        {
          error: 'Créditos insuficientes',
          currentCredits,
          required: amount
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      currentCredits,
      sufficient: true
    });
  } catch (error) {
    console.error('Erro ao verificar créditos:', error);
    return NextResponse.json(
      { error: 'Erro interno ao verificar créditos' },
      { status: 500 }
    );
  }
}
