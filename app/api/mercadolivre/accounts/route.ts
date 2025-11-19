import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ensureMercadoLivreAccessToken, MercadoLivreAccountRecord } from '../token-utils';

// Listar contas conectadas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID é obrigatório' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT
        id,
        user_id,
        ml_user_id,
        nickname,
        email,
        first_name,
        last_name,
        country_id,
        access_token,
        refresh_token,
        expires_at,
        token_type,
        scope,
        created_at,
        updated_at
      FROM mercadolivre_accounts
      WHERE user_id = $1
      ORDER BY created_at DESC`,
      [userId]
    );

    const refreshedAccounts = [];
    for (const rawAccount of result.rows as MercadoLivreAccountRecord[]) {
      let account = rawAccount;
      try {
        account = await ensureMercadoLivreAccessToken(pool, rawAccount);
      } catch (refreshError) {
        console.error(`Failed to refresh Mercado Livre token for account ${rawAccount.id}:`, refreshError);
      }

      refreshedAccounts.push({
        id: account.id,
        ml_user_id: account.ml_user_id,
        nickname: account.nickname,
        email: account.email,
        first_name: account.first_name,
        last_name: account.last_name,
        country_id: account.country_id,
        expires_at: account.expires_at,
        created_at: rawAccount.created_at,
        updated_at: rawAccount.updated_at,
      });
    }

    return NextResponse.json({ accounts: refreshedAccounts });

  } catch (error) {
    console.error('Erro ao buscar contas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar contas conectadas' },
      { status: 500 }
    );
  }
}

// Deletar conta conectada
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const accountId = searchParams.get('accountId');

    if (!userId || !accountId) {
      return NextResponse.json(
        { error: 'User ID e Account ID são obrigatórios' },
        { status: 400 }
      );
    }

    await pool.query(
      'DELETE FROM mercadolivre_accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId]
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro ao deletar conta:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar conta' },
      { status: 500 }
    );
  }
}
