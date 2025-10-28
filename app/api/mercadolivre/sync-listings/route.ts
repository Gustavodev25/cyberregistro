import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { ensureMercadoLivreAccessToken, MercadoLivreAccountRecord } from '../token-utils';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

interface MLListing {
  id: string;
  title: string;
  thumbnail: string;
  price: number;
  available_quantity: number;
  sold_quantity: number;
  status: string;
  permalink: string;
  listing_type_id: string;
  condition: string;
  date_created: string;
  last_updated: string;
}

// Fetch all listings (all relevant statuses) with pagination
async function fetchAllMLListings(mlUserId: string, accessToken: string): Promise<MLListing[]> {
  const limit = 50;
  const allIds = new Set<string>();

  // Known item statuses on Mercado Livre for items API.
  // We include a broad set to ensure we capture everything relevant.
  const statuses = [
    'active',
    'paused',
    'under_review',
    'closed',
    // Extra/edge statuses that may appear depending on account/site policies
    'inactive',
    'not_yet_active',
    'payment_required',
    'blocked',
  ];

  // Helper to collect ids for a given status using scan and fallback to offset,
  // swallowing per-status errors so a single invalid status won't break the sync.
  const collectIdsForStatus = async (statusParam?: string) => {
    // Try scan first
    try {
      let scrollId: string | undefined = undefined;
      let guard = 0;
      while (true) {
        const base = `https://api.mercadolibre.com/users/${mlUserId}/items/search?search_type=scan&limit=${limit}`;
        const url = base + (statusParam ? `&status=${statusParam}` : '') + (scrollId ? `&scroll_id=${encodeURIComponent(scrollId)}` : '');
        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!res.ok) throw new Error('scan_not_supported');
        const data = await res.json();
        const batch: string[] = data.results || [];
        batch.forEach(id => allIds.add(id));
        scrollId = data.scroll_id;
        if (!scrollId || batch.length === 0) break;
        guard++;
        if (guard > 1000) break; // safety
      }
      return; // success via scan
    } catch (_) {
      // ignore and try offset pagination
    }

    // Fallback: offset pagination
    try {
      let offset = 0;
      let guard = 0;
      while (true) {
        const base = `https://api.mercadolibre.com/users/${mlUserId}/items/search?limit=${limit}&offset=${offset}`;
        const url = base + (statusParam ? `&status=${statusParam}` : '');
        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!res.ok) throw new Error(`error_${res.status}`);
        const data = await res.json();
        const batch: string[] = data.results || [];
        batch.forEach(id => allIds.add(id));
        if (batch.length < limit) break;
        offset += limit;
        guard++;
        if (guard > 400) break; // safety
      }
    } catch (_) {
      // Swallow error for this specific status and continue with others
    }
  };

  // First collect without status (usually returns active; harmless if duplicates)
  await collectIdsForStatus(undefined);
  // Then collect for each explicit status including closed/inactive/etc.
  for (const status of statuses) {
    await collectIdsForStatus(status);
  }

  const itemIds = Array.from(allIds);
  if (itemIds.length === 0) return [];

  const listings: MLListing[] = [];
  const batchSize = 20;
  for (let i = 0; i < itemIds.length; i += batchSize) {
    const batch = itemIds.slice(i, i + batchSize);
    const ids = batch.join(',');
    const detailsResponse = await fetch(
      `https://api.mercadolibre.com/items?ids=${ids}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (detailsResponse.ok) {
      const detailsData = await detailsResponse.json();
      detailsData.forEach((item: any) => {
        if (item.code === 200 && item.body) {
          listings.push({
            id: item.body.id,
            title: item.body.title,
            thumbnail: item.body.thumbnail,
            price: item.body.price,
            available_quantity: item.body.available_quantity,
            sold_quantity: item.body.sold_quantity,
            status: item.body.status,
            permalink: item.body.permalink,
            listing_type_id: item.body.listing_type_id,
            condition: item.body.condition,
            date_created: item.body.date_created,
            last_updated: item.body.last_updated,
          });
        }
      });
    }
  }

  return listings;
}

// Sync listings with streaming progress
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, accountIds } = body;

    if (!userId || !accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return NextResponse.json({ error: 'userId and accountIds (array) are required' }, { status: 400 });
    }

    // Create a readable stream for Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          console.log('Sending SSE event:', event, data);
          controller.enqueue(encoder.encode(message));
        };

        const allListings: any[] = [];
        const errors: any[] = [];

        try {
          for (const accountId of accountIds) {
            try {
              const accountResult = await pool.query(
                `SELECT id, user_id, ml_user_id, access_token, refresh_token, expires_at, nickname, token_type, scope
                 FROM mercadolivre_accounts
                 WHERE id = $1 AND user_id = $2`,
                [accountId, userId]
              );

              if (accountResult.rows.length === 0) {
                errors.push({ accountId, error: 'Account not found' });
                sendEvent('error', { accountId, error: 'Account not found' });
                continue;
              }

              let account = accountResult.rows[0] as MercadoLivreAccountRecord;

              try {
                account = await ensureMercadoLivreAccessToken(pool, account);
              } catch (refreshError: any) {
                const message = refreshError?.message || 'Failed to refresh access token';
                errors.push({ accountId, nickname: account.nickname, error: message });
                sendEvent('error', { accountId, nickname: account.nickname, error: message });
                continue;
              }

              // Send fetching event
              sendEvent('fetching', { accountId, nickname: account.nickname });
              await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to ensure flush

              const listings = await fetchAllMLListings(account.ml_user_id.toString(), account.access_token);

              // Send found event
              sendEvent('found', {
                accountId,
                nickname: account.nickname,
                count: listings.length
              });
              await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to ensure flush

              // Save listings and send progress for this account
              let savedForAccount = 0;
              for (let i = 0; i < listings.length; i++) {
                const listing = listings[i];
                await pool.query(
                  `INSERT INTO anuncios (
                    user_id, ml_account_id, mlb_code, title, thumbnail,
                    price, available_quantity, sold_quantity, status,
                    permalink, listing_type_id, condition,
                    created_at_ml, updated_at_ml, synced_at
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
                  ON CONFLICT (ml_account_id, mlb_code)
                  DO UPDATE SET
                    title = EXCLUDED.title,
                    thumbnail = EXCLUDED.thumbnail,
                    price = EXCLUDED.price,
                    available_quantity = EXCLUDED.available_quantity,
                    sold_quantity = EXCLUDED.sold_quantity,
                    status = EXCLUDED.status,
                    permalink = EXCLUDED.permalink,
                    listing_type_id = EXCLUDED.listing_type_id,
                    condition = EXCLUDED.condition,
                    updated_at_ml = EXCLUDED.updated_at_ml,
                    synced_at = CURRENT_TIMESTAMP`,
                  [
                    userId,
                    account.id,
                    listing.id,
                    listing.title,
                    listing.thumbnail,
                    listing.price,
                    listing.available_quantity,
                    listing.sold_quantity,
                    listing.status,
                    listing.permalink,
                    listing.listing_type_id,
                    listing.condition,
                    listing.date_created,
                    listing.last_updated,
                  ]
                );

                savedForAccount++;

                // Send progress every 5 items or on last item
                if (savedForAccount % 5 === 0 || i === listings.length - 1) {
                  sendEvent('progress', {
                    accountId,
                    nickname: account.nickname,
                    saved: savedForAccount
                  });
                }
              }

              allListings.push({ accountId, nickname: account.nickname, count: listings.length });
            } catch (error: any) {
              console.error(`Erro ao sincronizar conta ${accountId}:`, error);
              errors.push({ accountId, error: error.message || 'Unknown error' });
              sendEvent('error', { accountId, error: error.message || 'Unknown error' });
            }
          }

          // Send complete event
          sendEvent('complete', {
            success: true,
            synced: allListings,
            errors: errors.length > 0 ? errors : undefined
          });
        } catch (error: any) {
          console.error('Erro ao sincronizar anuncios:', error);
          sendEvent('error', { error: 'Erro ao sincronizar anuncios' });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Erro ao sincronizar anuncios:', error);
    return NextResponse.json({ error: 'Erro ao sincronizar anuncios' }, { status: 500 });
  }
}

// List listings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const perPageParam = parseInt(searchParams.get('perPage') || '21', 10);
    const searchTerm = (searchParams.get('search') || '').trim();
    const statusFilter = (searchParams.get('status') || '').trim();
    const accountParam = (searchParams.get('accountId') || '').trim();
    const accountId = accountParam ? parseInt(accountParam, 10) : null;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const perPage = Number.isFinite(perPageParam) && perPageParam > 0 && perPageParam <= 100 ? perPageParam : 21;
    const offset = (page - 1) * perPage;

    const whereClauses: string[] = ['a.user_id = $1'];
    const params: (string | number)[] = [userId];
    let paramIndex = 2;

    if (statusFilter) {
      whereClauses.push(`a.status = $${paramIndex}`);
      params.push(statusFilter);
      paramIndex++;
    }

    if (accountId) {
      whereClauses.push(`a.ml_account_id = $${paramIndex}`);
      params.push(accountId);
      paramIndex++;
    }

    if (searchTerm) {
      // Se começar com MLB ou for só números, buscar exato no mlb_code
      const isMLBCode = searchTerm.toUpperCase().startsWith('MLB') || /^\d+$/.test(searchTerm);

      if (isMLBCode) {
        // Remover "MLB" se existir para buscar apenas pelos números
        const numericSearch = searchTerm.replace(/^MLB/i, '');
        whereClauses.push(`(
          a.mlb_code ILIKE $${paramIndex}
          OR a.mlb_code ILIKE $${paramIndex + 1}
          OR a.title ILIKE $${paramIndex + 2}
        )`);
        params.push(`MLB${numericSearch}%`); // Busca exata começando com MLB+números
        params.push(`%${numericSearch}%`); // Busca pelos números em qualquer parte
        params.push(`%${searchTerm}%`); // Busca no título
        paramIndex += 3;
      } else {
        // Busca normal em título, mlb_code e permalink
        whereClauses.push(`(
          a.title ILIKE $${paramIndex}
          OR a.mlb_code ILIKE $${paramIndex}
          OR COALESCE(a.permalink, '') ILIKE $${paramIndex}
        )`);
        params.push(`%${searchTerm}%`);
        paramIndex++;
      }
    }

    const whereClause = whereClauses.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*)::int as total, MAX(synced_at) as latest_synced_at
       FROM anuncios a
       WHERE ${whereClause}`,
      params
    );

    const total = countRes.rows[0]?.total || 0;
    const latestSyncedAt = countRes.rows[0]?.latest_synced_at || null;

    const listRes = await pool.query(
      `SELECT
        a.*,
        ma.nickname as account_nickname,
        ma.first_name as account_first_name,
        ma.last_name as account_last_name
       FROM anuncios a
       LEFT JOIN mercadolivre_accounts ma ON a.ml_account_id = ma.id
       WHERE ${whereClause}
       ORDER BY a.synced_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, perPage, offset]
    );

    return NextResponse.json({ listings: listRes.rows, total, latestSyncedAt, page, perPage });
  } catch (error) {
    console.error('Erro ao buscar anuncios:', error);
    return NextResponse.json({ error: 'Erro ao buscar anuncios' }, { status: 500 });
  }
}
