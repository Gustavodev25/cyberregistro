import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Iniciando migrations...');

    // Lista de migrations para executar
    const migrations = [
      'create_anuncios.sql',
      'alter_anuncios_registro.sql',
      'add_credits_and_transactions.sql'
    ];

    const results = [];

    for (const migration of migrations) {
      try {
        const filePath = path.join(process.cwd(), 'sql', migration);
        const sql = fs.readFileSync(filePath, 'utf-8');

        console.log(`📄 Executando ${migration}...`);
        await pool.query(sql);
        console.log(`✅ ${migration} executado com sucesso!`);

        results.push({
          file: migration,
          status: 'success'
        });
      } catch (error: any) {
        console.error(`❌ Erro ao executar ${migration}:`, error.message);
        results.push({
          file: migration,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log('✨ Migrations finalizadas!');

    return NextResponse.json({
      success: true,
      message: 'Migrations executadas',
      results
    });
  } catch (error: any) {
    console.error('💥 Erro durante as migrations:', error);
    return NextResponse.json(
      { error: 'Erro ao executar migrations', details: error.message },
      { status: 500 }
    );
  }
}
