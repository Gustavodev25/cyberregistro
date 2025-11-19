import { NextRequest, NextResponse } from "next/server";
import { asaasService } from "@/app/services/asaas";
import { applyPaymentConfirmation } from "@/lib/payments";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("Webhook Asaas recebido:", JSON.stringify(body, null, 2));

    // Validar webhook
    if (!asaasService.validateWebhook(body)) {
      console.error("Webhook inválido");
      return NextResponse.json({ error: "Webhook inválido" }, { status: 400 });
    }

    const { event, payment } = body;

    if (!event || !payment) {
      console.error("Evento ou pagamento não fornecido");
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    switch (event) {
      case "PAYMENT_RECEIVED":
      case "PAYMENT_CONFIRMED":
        // Ignorar pagamentos sem externalReference (pagamentos duplicados/antigos)
        if (!payment.externalReference) {
          console.log("Webhook ignorado - Pagamento sem externalReference:", payment.id);
          break;
        }
        await applyPaymentConfirmation(payment);
        break;

      case "PAYMENT_OVERDUE":
        console.log("Pagamento vencido:", payment.id);
        break;

      case "PAYMENT_DELETED":
      case "PAYMENT_REFUNDED":
        console.log("Pagamento cancelado/estornado:", payment.id);
        break;

      default:
        console.log("Evento não tratado:", event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    return NextResponse.json(
      {
        error: "Erro ao processar webhook",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}
