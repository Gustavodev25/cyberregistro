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

// Listar todos os cupons
export async function GET(request: NextRequest) {
  try {
    const user = verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const result = await pool.query(
      `SELECT
        id,
        code,
        discount_type,
        discount_value,
        max_uses,
        uses_count,
        expires_at,
        is_active,
        created_at,
        updated_at
      FROM cupons
      ORDER BY created_at DESC`
    );

    return NextResponse.json({ cupons: result.rows });

  } catch (error) {
    console.error('Erro ao buscar cupons:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar cupons' },
      { status: 500 }
    );
  }
}

// Criar novo cupom
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
    const { code, discount_type, discount_value, max_uses, expires_at } = body;

    // Validações
    if (!code || !code.trim()) {
      return NextResponse.json(
        { error: 'Código do cupom é obrigatório' },
        { status: 400 }
      );
    }

    if (!discount_type || !['percentage', 'fixed'].includes(discount_type)) {
      return NextResponse.json(
        { error: 'Tipo de desconto inválido' },
        { status: 400 }
      );
    }

    if (!discount_value || discount_value <= 0) {
      return NextResponse.json(
        { error: 'Valor do desconto deve ser maior que zero' },
        { status: 400 }
      );
    }

    if (discount_type === 'percentage' && discount_value > 100) {
      return NextResponse.json(
        { error: 'Percentual não pode ser maior que 100%' },
        { status: 400 }
      );
    }

    // Verificar se o cupom já existe
    const existingCupom = await pool.query(
      'SELECT id FROM cupons WHERE UPPER(code) = UPPER($1)',
      [code.trim()]
    );

    if (existingCupom.rows.length > 0) {
      return NextResponse.json(
        { error: 'Já existe um cupom com este código' },
        { status: 400 }
      );
    }

    // Criar cupom
    const result = await pool.query(
      `INSERT INTO cupons (
        code,
        discount_type,
        discount_value,
        max_uses,
        expires_at,
        is_active,
        uses_count
      ) VALUES ($1, $2, $3, $4, $5, true, 0)
      RETURNING
        id,
        code,
        discount_type,
        discount_value,
        max_uses,
        uses_count,
        expires_at,
        is_active,
        created_at`,
      [
        code.toUpperCase().trim(),
        discount_type,
        discount_value,
        max_uses || null,
        expires_at || null
      ]
    );

    return NextResponse.json({ cupom: result.rows[0] }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar cupom:', error);
    return NextResponse.json(
      { error: 'Erro ao criar cupom' },
      { status: 500 }
    );
  }
}
