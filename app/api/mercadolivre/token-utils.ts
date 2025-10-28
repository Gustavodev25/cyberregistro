import { Pool } from 'pg';

export interface MercadoLivreAccountRecord {
  id: number;
  user_id: number;
  ml_user_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  nickname?: string;
  email?: string;
  first_name?: string | null;
  last_name?: string | null;
  country_id?: string | null;
  token_type?: string | null;
  scope?: string | null;
  created_at?: string;
  updated_at?: string;
}

const REFRESH_THRESHOLD_MS = 2 * 60 * 1000; // refresh if less than 2 minutes left

export async function ensureMercadoLivreAccessToken(
  pool: Pool,
  account: MercadoLivreAccountRecord
): Promise<MercadoLivreAccountRecord> {
  const expiresAt = new Date(account.expires_at);
  const now = Date.now();

  if (expiresAt.getTime() - now > REFRESH_THRESHOLD_MS) {
    return account;
  }

  if (!account.refresh_token) {
    throw new Error('Missing refresh token');
  }

  const clientId = process.env.ML_APP_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Mercado Livre credentials');
  }

  const refreshResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.refresh_token,
    }),
  });

  if (!refreshResponse.ok) {
    const errorText = await refreshResponse.text();
    throw new Error(`Failed to refresh token: ${errorText}`);
  }

  const tokenData = await refreshResponse.json();
  const newAccessToken: string = tokenData.access_token;
  const newRefreshToken: string = tokenData.refresh_token || account.refresh_token;
  const expiresIn: number = tokenData.expires_in || 0;
  const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

  const updateResult = await pool.query(
    `UPDATE mercadolivre_accounts
     SET access_token = $1,
         refresh_token = $2,
         expires_at = $3,
         token_type = COALESCE($4, token_type),
         scope = COALESCE($5, scope),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $6
     RETURNING id, user_id, ml_user_id, nickname, email, first_name, last_name, country_id,
               access_token, refresh_token, expires_at, token_type, scope`,
    [
      newAccessToken,
      newRefreshToken,
      newExpiresAt,
      tokenData.token_type ?? null,
      tokenData.scope ?? null,
      account.id,
    ]
  );

  const updatedAccount = updateResult.rows[0] as MercadoLivreAccountRecord;
  return {
    ...account,
    ...updatedAccount,
    expires_at: updatedAccount.expires_at,
    access_token: updatedAccount.access_token,
    refresh_token: updatedAccount.refresh_token,
    token_type: updatedAccount.token_type,
    scope: updatedAccount.scope,
  };
}
