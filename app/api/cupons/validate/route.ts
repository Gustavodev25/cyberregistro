import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Função para verificar autenticação
function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch (error) {
    return null;
  }
}

// Validar cupom e calcular desconto
export async function POST(request: NextRequest) {
  try {
    const user = verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { code, total } = body;

    if (!code || !code.trim()) {
      return NextResponse.json(
        { error: 'Código do cupom é obrigatório' },
        { status: 400 }
      );
    }

    if (!total || total <= 0) {
      return NextResponse.json(
        { error: 'Valor total inválido' },
        { status: 400 }
      );
    }

    // Buscar cupom
    const result = await pool.query(
      `SELECT
        id,
        code,
        discount_type,
        discount_value,
        max_uses,
        uses_count,
        expires_at,
        is_active
      FROM cupons
      WHERE UPPER(code) = UPPER($1)`,
      [code.trim()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Cupom não encontrado' },
        { status: 404 }
      );
    }

    const cupom = result.rows[0];

    // Validar se o cupom está ativo
    if (!cupom.is_active) {
      return NextResponse.json(
        { error: 'Cupom inativo' },
        { status: 400 }
      );
    }

    // Validar se o cupom expirou
    if (cupom.expires_at) {
      const expiresAt = new Date(cupom.expires_at);
      const now = new Date();
      if (now > expiresAt) {
        return NextResponse.json(
          { error: 'Cupom expirado' },
          { status: 400 }
        );
      }
    }

    // Validar limite de usos
    if (cupom.max_uses !== null && cupom.uses_count >= cupom.max_uses) {
      return NextResponse.json(
        { error: 'Cupom atingiu o limite de usos' },
        { status: 400 }
      );
    }

    // Calcular desconto
    let discountAmount = 0;
    if (cupom.discount_type === 'percentage') {
      discountAmount = (total * cupom.discount_value) / 100;
    } else if (cupom.discount_type === 'fixed') {
      discountAmount = cupom.discount_value;
    }

    // Garantir que o desconto não seja maior que o total
    discountAmount = Math.min(discountAmount, total);

    const finalTotal = total - discountAmount;

    return NextResponse.json({
      valid: true,
      cupom: {
        id: cupom.id,
        code: cupom.code,
        discount_type: cupom.discount_type,
        discount_value: cupom.discount_value,
      },
      discount: discountAmount,
      finalTotal: finalTotal,
    });

  } catch (error) {
    console.error('Erro ao validar cupom:', error);
    return NextResponse.json(
      { error: 'Erro ao validar cupom' },
      { status: 500 }
    );
  }
}
