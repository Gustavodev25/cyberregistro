import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    // Buscar cupom pelo token
    const cupomResult = await pool.query(
      `SELECT id, code, discount_type, discount_value, max_uses, uses_count, expires_at, is_active, created_at
       FROM cupons
       WHERE partner_token = $1`,
      [token]
    );

    if (cupomResult.rows.length === 0) {
      return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 });
    }

    const cupom = cupomResult.rows[0];

    // Buscar histórico de uso
    const usageResult = await pool.query(
      `SELECT used_at, discount_applied
       FROM cupons_usage
       WHERE cupom_id = $1
       ORDER BY used_at DESC
       LIMIT 100`,
      [cupom.id]
    );

    // Calcular total economizado (desconto dado)
    const totalDiscountResult = await pool.query(
        `SELECT SUM(discount_applied) as total
         FROM cupons_usage
         WHERE cupom_id = $1`,
        [cupom.id]
    );
    
    const totalDiscount = totalDiscountResult.rows[0].total || 0;

    return NextResponse.json({
      cupom,
      stats: {
        total_uses: cupom.uses_count,
        total_discount: totalDiscount,
        recent_usage: usageResult.rows
      }
    });

  } catch (error) {
    console.error('Erro ao buscar dados do parceiro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
