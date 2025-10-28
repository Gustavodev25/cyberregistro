import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { asaasService } from "@/app/services/asaas";
import {
  applyPaymentConfirmation,
  isPaymentStatusConfirmed,
} from "@/lib/payments";

const JWT_SECRET = process.env.JWT_SECRET || "";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const paymentId = body?.paymentId || request.nextUrl.searchParams.get("id");

    if (!paymentId) {
      return NextResponse.json(
        { error: "paymentId é obrigatório" },
        { status: 400 },
      );
    }

    const payment = await asaasService.getPaymentStatus(paymentId);

    if (!isPaymentStatusConfirmed(payment.status)) {
      return NextResponse.json(
        {
          error: "Pagamento ainda não confirmado",
          status: payment.status,
        },
        { status: 400 },
      );
    }

    const result = await applyPaymentConfirmation(payment);

    return NextResponse.json({
      success: true,
      status: payment.status,
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (error) {
    console.error("Erro ao completar pagamento:", error);
    return NextResponse.json(
      {
        error: "Erro ao completar pagamento",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}
