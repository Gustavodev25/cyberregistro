import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    const { nome, email, senha } = await request.json();

    // Validações
    if (!nome || !email || !senha) {
      return NextResponse.json(
        { erro: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    if (senha.length < 6) {
      return NextResponse.json(
        { erro: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Verificar se o email já existe
    const usuarioExistente = await query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );

    if (usuarioExistente.rows.length > 0) {
      return NextResponse.json(
        { erro: 'Este email já está cadastrado' },
        { status: 409 }
      );
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Inserir novo usuário
    const resultado = await query(
      'INSERT INTO usuarios (nome, email, senha, criado_em) VALUES ($1, $2, $3, NOW()) RETURNING id, nome, email, criado_em',
      [nome, email, senhaHash]
    );

    const novoUsuario = resultado.rows[0];

    return NextResponse.json(
      {
        mensagem: 'Usuário cadastrado com sucesso',
        usuario: {
          id: novoUsuario.id,
          nome: novoUsuario.nome,
          email: novoUsuario.email,
          criado_em: novoUsuario.criado_em
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
