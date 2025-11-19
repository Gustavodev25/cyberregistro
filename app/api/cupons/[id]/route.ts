import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

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

// Atualizar status do cupom
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'is_active deve ser um boolean' },
        { status: 400 }
      );
    }

    const resolvedParams = await params;

    const result = await pool.query(
      `UPDATE cupons
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        code,
        discount_type,
        discount_value,
        max_uses,
        uses_count,
        expires_at,
        is_active,
        created_at,
        updated_at`,
      [is_active, resolvedParams.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Cupom não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ cupom: result.rows[0] });

  } catch (error) {
    console.error('Erro ao atualizar cupom:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar cupom' },
      { status: 500 }
    );
  }
}
