import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // userId
    const error = searchParams.get('error');

    // Função auxiliar para retornar HTML de erro minimalista
    const returnError = (errorType: string, errorMessage: string) => {
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Erro</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background: #fafafa;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
            }
            .container {
              max-width: 320px;
              width: 100%;
              text-align: center;
            }
            .card {
              background: white;
              border-radius: 16px;
              padding: 32px 24px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.05);
              border: 1px solid #e5e5e5;
            }
            .icon {
              width: 48px;
              height: 48px;
              margin: 0 auto 16px;
              background: #fef2f2;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .xmark {
              width: 24px;
              height: 24px;
              border: 2px solid #ef4444;
              border-radius: 50%;
              position: relative;
            }
            .xmark::before,
            .xmark::after {
              content: '';
              position: absolute;
              left: 50%;
              top: 50%;
              width: 12px;
              height: 2px;
              background: #ef4444;
            }
            .xmark::before {
              transform: translate(-50%, -50%) rotate(45deg);
            }
            .xmark::after {
              transform: translate(-50%, -50%) rotate(-45deg);
            }
            h1 {
              font-size: 18px;
              font-weight: 600;
              color: #171717;
              margin-bottom: 8px;
            }
            p {
              font-size: 14px;
              color: #737373;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="icon">
                <div class="xmark"></div>
              </div>
              <h1>${errorMessage}</h1>
              <p>Fechando...</p>
            </div>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'ML_AUTH_ERROR', error: '${errorType}' }, '*');
              setTimeout(() => window.close(), 2000);
            } else {
              setTimeout(() => {
                window.location.href = '/contas-conectadas?error=${errorType}';
              }, 2000);
            }
          </script>
        </body>
        </html>
      `;
      return new NextResponse(errorHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    };

    if (error) {
      return returnError(error, 'Autorização negada');
    }

    if (!code || !state) {
      return returnError('invalid_callback', 'Callback inválido');
    }

    const userId = parseInt(state);

    // Trocar código por token
    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ML_APP_ID!,
        client_secret: process.env.ML_CLIENT_SECRET!,
        code: code,
        redirect_uri: process.env.ML_REDIRECT_URI!
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Erro ao obter token:', errorData);
      return returnError('token_exchange_failed', 'Falha ao obter token');
    }

    const tokenData = await tokenResponse.json();

    // Obter informações do usuário do Mercado Livre
    const userResponse = await fetch(`https://api.mercadolibre.com/users/me`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      console.error('Erro ao obter dados do usuário');
      return returnError('user_data_failed', 'Falha ao obter dados do usuário');
    }

    const userData = await userResponse.json();

    // Calcular data de expiração
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    // Salvar ou atualizar no banco de dados
    await pool.query(
      `INSERT INTO mercadolivre_accounts
        (user_id, ml_user_id, nickname, email, first_name, last_name, country_id,
         access_token, refresh_token, expires_at, token_type, scope)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (user_id, ml_user_id)
      DO UPDATE SET
        nickname = EXCLUDED.nickname,
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        country_id = EXCLUDED.country_id,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expires_at = EXCLUDED.expires_at,
        token_type = EXCLUDED.token_type,
        scope = EXCLUDED.scope,
        updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        userData.id,
        userData.nickname,
        userData.email,
        userData.first_name,
        userData.last_name,
        userData.country_id,
        tokenData.access_token,
        tokenData.refresh_token,
        expiresAt,
        tokenData.token_type || 'Bearer',
        tokenData.scope || ''
      ]
    );

    // Criar página HTML minimalista que fecha o popup e notifica a janela pai
    const successHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sucesso</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #fafafa;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }
          .container {
            max-width: 320px;
            width: 100%;
            text-align: center;
          }
          .card {
            background: white;
            border-radius: 16px;
            padding: 32px 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            border: 1px solid #e5e5e5;
          }
          .icon {
            width: 48px;
            height: 48px;
            margin: 0 auto 16px;
            background: #f5f5f5;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .checkmark {
            width: 24px;
            height: 24px;
            border: 2px solid #22c55e;
            border-radius: 50%;
            position: relative;
          }
          .checkmark::after {
            content: '';
            position: absolute;
            left: 6px;
            top: 2px;
            width: 6px;
            height: 12px;
            border: solid #22c55e;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
          }
          h1 {
            font-size: 18px;
            font-weight: 600;
            color: #171717;
            margin-bottom: 8px;
          }
          p {
            font-size: 14px;
            color: #737373;
            line-height: 1.5;
          }
          .spinner {
            margin: 20px auto 0;
            width: 20px;
            height: 20px;
            border: 2px solid #e5e5e5;
            border-top-color: #171717;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="icon">
              <div class="checkmark"></div>
            </div>
            <h1>Conta Conectada</h1>
            <p>Fechando automaticamente...</p>
            <div class="spinner"></div>
          </div>
        </div>
        <script>
          // Notificar janela pai e fechar popup
          if (window.opener) {
            window.opener.postMessage({ type: 'ML_AUTH_SUCCESS' }, '*');
            setTimeout(() => window.close(), 1500);
          } else {
            // Se não for popup, redirecionar normalmente
            setTimeout(() => {
              window.location.href = '/contas-conectadas?success=true';
            }, 1500);
          }
        </script>
      </body>
      </html>
    `;

    return new NextResponse(successHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error) {
    console.error('Erro no callback do Mercado Livre:', error);

    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Erro</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #fafafa;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }
          .container {
            max-width: 320px;
            width: 100%;
            text-align: center;
          }
          .card {
            background: white;
            border-radius: 16px;
            padding: 32px 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            border: 1px solid #e5e5e5;
          }
          .icon {
            width: 48px;
            height: 48px;
            margin: 0 auto 16px;
            background: #fef2f2;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .xmark {
            width: 24px;
            height: 24px;
            border: 2px solid #ef4444;
            border-radius: 50%;
            position: relative;
          }
          .xmark::before,
          .xmark::after {
            content: '';
            position: absolute;
            left: 50%;
            top: 50%;
            width: 12px;
            height: 2px;
            background: #ef4444;
          }
          .xmark::before {
            transform: translate(-50%, -50%) rotate(45deg);
          }
          .xmark::after {
            transform: translate(-50%, -50%) rotate(-45deg);
          }
          h1 {
            font-size: 18px;
            font-weight: 600;
            color: #171717;
            margin-bottom: 8px;
          }
          p {
            font-size: 14px;
            color: #737373;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="icon">
              <div class="xmark"></div>
            </div>
            <h1>Erro ao Conectar</h1>
            <p>Ocorreu um erro inesperado. Fechando...</p>
          </div>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'ML_AUTH_ERROR', error: 'unexpected_error' }, '*');
            setTimeout(() => window.close(), 2000);
          } else {
            setTimeout(() => {
              window.location.href = '/contas-conectadas?error=unexpected_error';
            }, 2000);
          }
        </script>
      </body>
      </html>
    `;

    return new NextResponse(errorHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
}
