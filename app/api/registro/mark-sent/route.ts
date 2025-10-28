import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body?.userId;
    const ids = Array.isArray(body?.ids) ? body.ids : [];

    if (!userId || ids.length === 0) {
      return NextResponse.json(
        { error: 'userId e ids são obrigatórios' },
        { status: 400 }
      );
    }

    // Sanitiza os IDs para inteiros únicos
    const adIds = Array.from(new Set(ids.map((v: any) => parseInt(String(v), 10)).filter((n: number) => Number.isFinite(n))));
    if (adIds.length === 0) {
      return NextResponse.json({ updated: 0 });
    }

    // Monta placeholders dinamicamente
    const placeholders = adIds.map((_, i) => `$${i + 2}`).join(',');
    const params: any[] = [userId, ...adIds];

    const sql = `
      UPDATE anuncios
         SET registro_enviado = TRUE,
             registro_enviado_em = NOW()
       WHERE user_id = $1
         AND id IN (${placeholders})
    `;

    const res = await pool.query(sql, params);
    return NextResponse.json({ updated: res.rowCount || 0 });
  } catch (error) {
    console.error('Erro ao marcar envio para registro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body?.userId;
    const ids = Array.isArray(body?.ids) ? body.ids : [];

    if (!userId || ids.length === 0) {
      return NextResponse.json(
        { error: 'userId e ids são obrigatórios' },
        { status: 400 }
      );
    }

    // Sanitiza os IDs para inteiros únicos
    const adIds = Array.from(new Set(ids.map((v: any) => parseInt(String(v), 10)).filter((n: number) => Number.isFinite(n))));
    if (adIds.length === 0) {
      return NextResponse.json({ updated: 0 });
    }

    // Monta placeholders dinamicamente
    const placeholders = adIds.map((_, i) => `$${i + 2}`).join(',');
    const params: any[] = [userId, ...adIds];

    const sql = `
      UPDATE anuncios
         SET registro_enviado = FALSE,
             registro_enviado_em = NULL
       WHERE user_id = $1
         AND id IN (${placeholders})
    `;

    const res = await pool.query(sql, params);
    return NextResponse.json({ updated: res.rowCount || 0 });
  } catch (error) {
    console.error('Erro ao remover envio para registro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

