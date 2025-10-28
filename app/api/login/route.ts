import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { email, senha } = await request.json();

    // Validações
    if (!email || !senha) {
      return NextResponse.json(
        { erro: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar usuário por email
    const resultado = await query(
      'SELECT id, nome, email, senha FROM usuarios WHERE email = $1',
      [email]
    );

    if (resultado.rows.length === 0) {
      return NextResponse.json(
        { erro: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    const usuario = resultado.rows[0];

    // Verificar senha
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta) {
      return NextResponse.json(
        { erro: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Gerar token JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome
      },
      process.env.JWT_SECRET || 'sua_chave_secreta_temporaria',
      { expiresIn: '7d' }
    );

    // Atualizar último login
    await query(
      'UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1',
      [usuario.id]
    );

    return NextResponse.json(
      {
        mensagem: 'Login realizado com sucesso',
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
