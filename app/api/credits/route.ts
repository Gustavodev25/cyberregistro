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

    const result = await query(
      "SELECT credits FROM usuarios WHERE id = $1 LIMIT 1",
      [decoded.id],
    );

    const credits = result.rows?.[0]?.credits ?? 0;

    return NextResponse.json({ credits });
  } catch (error) {
    console.error("Erro ao buscar créditos:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar créditos",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}
