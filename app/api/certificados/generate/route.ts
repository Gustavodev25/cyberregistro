import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { generateRegistroCertificatePDFServer, RegistroCertificateInput } from '@/app/utils/registroCertificateServer';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * POST /api/certificados/generate
 * Gera um certificado pela primeira vez e armazena no banco
 * Se já existir, retorna erro
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anuncioId, userId } = body;

    if (!userId || !Number.isFinite(anuncioId)) {
      return NextResponse.json(
        { error: 'userId e anuncioId são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o certificado já foi gerado
    const checkSql = `
      SELECT
        id,
        registro_pdf_data,
        registro_hash,
        registro_gerado_em
      FROM anuncios
      WHERE id = $1 AND user_id = $2
    `;

    const checkResult = await pool.query(checkSql, [anuncioId, userId]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Anúncio não encontrado' }, { status: 404 });
    }

    const existing = checkResult.rows[0];

    // Se já tem PDF armazenado, retornar erro - não permitir regeneração
    if (existing.registro_pdf_data) {
      return NextResponse.json(
        {
          error: 'Certificado já foi gerado anteriormente',
          hash: existing.registro_hash,
          geradoEm: existing.registro_gerado_em,
        },
        { status: 409 } // Conflict
      );
    }

    // Buscar dados completos do anúncio para gerar o certificado
    const anuncioSql = `
      SELECT
        a.*,
        ma.nickname as account_nickname,
        ma.first_name as account_first_name,
        ma.last_name as account_last_name,
        u.nome as usuario_nome,
        u.email as usuario_email
      FROM anuncios a
      LEFT JOIN mercadolivre_accounts ma ON a.ml_account_id = ma.id
      LEFT JOIN usuarios u ON a.user_id = u.id
      WHERE a.id = $1 AND a.user_id = $2
    `;

    const anuncioResult = await pool.query(anuncioSql, [anuncioId, userId]);
    const anuncio = anuncioResult.rows[0];

    // Preparar input para geração do certificado
    const input: RegistroCertificateInput = {
      title: anuncio.title,
      mlbCode: anuncio.mlb_code,
      permalink: anuncio.permalink || undefined,
      account: {
        nickname: anuncio.account_nickname || undefined,
        firstName: anuncio.account_first_name || undefined,
        lastName: anuncio.account_last_name || undefined,
      },
      usuario: {
        nome: anuncio.usuario_nome || 'Usuário',
        email: anuncio.usuario_email || undefined,
        // Campo CPF/CNPJ não está presente na tabela usuarios atualmente
        cpfCnpj: undefined,
      },
    };

    // Gerar certificado (versão server-side que retorna bytes)
    const { pdfBytes, hash, timestamp } = await generateRegistroCertificatePDFServer(input);

    // Armazenar no banco de dados
    const updateSql = `
      UPDATE anuncios
      SET
        registro_pdf_data = $1,
        registro_hash = $2,
        registro_gerado_em = $3,
        registro_status = 'protegido'
      WHERE id = $4 AND user_id = $5
      RETURNING id, registro_hash, registro_gerado_em
    `;

    const updateResult = await pool.query(updateSql, [
      Buffer.from(pdfBytes),
      hash,
      timestamp,
      anuncioId,
      userId,
    ]);

    if (updateResult.rows.length === 0) {
      return NextResponse.json({ error: 'Erro ao armazenar certificado' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      hash,
      geradoEm: timestamp,
      message: 'Certificado gerado e armazenado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao gerar certificado:', error);
    return NextResponse.json({ error: 'Erro interno ao gerar certificado' }, { status: 500 });
  }
}
