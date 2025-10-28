import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { query } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "";

interface JWTPayload {
  id: string;
  email: string;
  nome?: string;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    let decoded: JWTPayload;
    try {
      decoded = verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      console.error("Erro ao verificar token:", error);
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    // Buscar todas as transações do usuário ordenadas por data (mais recente primeiro)
    const result = await query(
      `SELECT
        id,
        type,
        amount,
        credits_quantity,
        payment_method,
        payment_id,
        status,
        description,
        created_at,
        updated_at
      FROM transactions
      WHERE user_id = $1
      ORDER BY created_at DESC`,
      [decoded.id]
    );

    const transactions = result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      amount: parseFloat(row.amount),
      creditsQuantity: row.credits_quantity,
      paymentMethod: row.payment_method,
      paymentId: row.payment_id,
      status: row.status,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar transações",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
