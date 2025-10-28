import { NextRequest, NextResponse } from 'next/server';

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

    const appId = process.env.ML_APP_ID;
    const redirectUri = process.env.ML_REDIRECT_URI;

    if (!appId || !redirectUri) {
      return NextResponse.json(
        { error: 'Configuração do Mercado Livre não encontrada' },
        { status: 500 }
      );
    }

    // URL de autorização do Mercado Livre
    const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${userId}`;

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Erro ao gerar URL de autenticação:', error);
    return NextResponse.json(
      { error: 'Erro ao iniciar autenticação' },
      { status: 500 }
    );
  }
}
