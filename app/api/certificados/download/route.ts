import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * GET /api/certificados/download?id=<anuncioId>
 * Retorna o PDF do certificado armazenado (nunca regenera)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    const anuncioId = parseInt(idParam || '', 10);

    if (!Number.isFinite(anuncioId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Buscar o PDF armazenado
    const sql = `
      SELECT
        registro_pdf_data,
        mlb_code,
        title,
        registro_hash,
        registro_gerado_em
      FROM anuncios
      WHERE id = $1
    `;

    const result = await pool.query(sql, [anuncioId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Anúncio não encontrado' }, { status: 404 });
    }

    const row = result.rows[0];

    if (!row.registro_pdf_data) {
      return NextResponse.json(
        { error: 'Certificado não foi gerado ainda para este anúncio' },
        { status: 404 }
      );
    }

    // Retornar o PDF armazenado
    const pdfBuffer = Buffer.from(row.registro_pdf_data);
    const fileName = `${(row.mlb_code || row.title || 'certificado').replace(/\s+/g, '_')}-certificado.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache agressivo - PDF nunca muda
      },
    });
  } catch (error) {
    console.error('Erro ao baixar certificado:', error);
    return NextResponse.json({ error: 'Erro interno ao baixar certificado' }, { status: 500 });
  }
}
