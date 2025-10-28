import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body?.userId;
    const idRaw = body?.id;
    const hash: string | null = typeof body?.hash === 'string' && body.hash.length ? body.hash : null;

    const anuncioId = parseInt(String(idRaw), 10);
    if (!userId || !Number.isFinite(anuncioId)) {
      return NextResponse.json(
        { error: 'userId e id são obrigatórios' },
        { status: 400 }
      );
    }

    const sql = `
      UPDATE anuncios
         SET registro_status = 'protegido',
             registro_gerado_em = NOW(),
             registro_hash = COALESCE($3, registro_hash)
       WHERE user_id = $1 AND id = $2
    `;

    const res = await pool.query(sql, [userId, anuncioId, hash]);
    if ((res.rowCount || 0) === 0) {
      return NextResponse.json({ updated: 0 }, { status: 404 });
    }
    return NextResponse.json({ updated: res.rowCount || 0 });
  } catch (error) {
    console.error('Erro ao marcar protegido:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

