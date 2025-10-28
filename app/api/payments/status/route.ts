import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { asaasService } from "@/app/services/asaas";

const JWT_SECRET = process.env.JWT_SECRET || "";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
      verify(token, JWT_SECRET);
    } catch (error) {
      console.error("Erro ao verificar token:", error);
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const paymentId = request.nextUrl.searchParams.get("id");

    if (!paymentId) {
      return NextResponse.json(
        { error: "Parâmetro id é obrigatório" },
        { status: 400 },
      );
    }

    const payment = await asaasService.getPaymentStatus(paymentId);

    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      value: payment.value,
      description: payment.description,
    });
  } catch (error) {
    console.error("Erro ao consultar status do pagamento:", error);
    return NextResponse.json(
      {
        error: "Erro ao consultar status",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}
