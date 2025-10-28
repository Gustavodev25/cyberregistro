import { NextRequest, NextResponse } from "next/server";
import { asaasService } from "@/app/services/asaas";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "";

interface JWTPayload {
  id: string;
  email: string;
  nome?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticaÃ§Ã£o - buscar token do header Authorization
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "NÃ£o autenticado" }, { status: 401 });
    }

    let decoded: JWTPayload;
    try {
      decoded = verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      console.error("Erro ao verificar token:", error);
      return NextResponse.json({ error: "Token invÃ¡lido" }, { status: 401 });
    }

    // Obter dados do corpo da requisiÃ§Ã£o
    const body = await request.json();
    const {
      quantity,
      total,
      customerName,
      customerEmail,
      customerCpfCnpj,
      customerPhone,
    } = body;

    if (!quantity || !total) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    if (!customerCpfCnpj || !customerPhone) {
      return NextResponse.json(
        { error: "CPF/CNPJ e telefone sÃ£o obrigatÃ³rios" },
        { status: 400 },
      );
    }

    const sanitizedCpf = String(customerCpfCnpj).replace(/\D/g, "").slice(0, 14);
    const sanitizedPhone = String(customerPhone).replace(/\D/g, "").slice(0, 11);

    if (!(sanitizedCpf.length === 11 || sanitizedCpf.length === 14)) {
      return NextResponse.json(
        { error: "CPF/CNPJ invÃ¡lido" },
        { status: 400 },
      );
    }

    if (!(sanitizedPhone.length === 10 || sanitizedPhone.length === 11)) {
      return NextResponse.json(
        { error: "Telefone invÃ¡lido" },
        { status: 400 },
      );
    }

    console.info("[PIX] Criando/atualizando cliente", {
      email: customerEmail || decoded.email,
      sanitizedCpf,
      sanitizedPhone,
      quantity,
      total,
    });

    // Criar ou buscar cliente no Asaas
    const customer = await asaasService.findOrCreateCustomer({
      name: customerName || decoded.nome || "Cliente",
      email: customerEmail || decoded.email,
      cpfCnpj: sanitizedCpf,
      mobilePhone: sanitizedPhone,
    });

    // Criar data de vencimento (hoje + 1 dia)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateString = dueDate.toISOString().split("T")[0];

    // Criar cobranÃ§a PIX
    const payment = await asaasService.createPixPayment({
      customer: customer.id,
      billingType: "PIX",
      value: total,
      dueDate: dueDateString,
      description: `Compra de ${quantity} credito(s) - CyberRegistro`,
      externalReference: `user_${decoded.id}_${Date.now()}_qty${quantity}`,
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        value: payment.value,
        pixQrCode: payment.pixQrCode,
        pixCopyPaste: payment.pixCopyPaste,
        dueDate: payment.dueDate,
      },
    });
  } catch (error) {
    console.error("Erro ao criar pagamento PIX:", error);
    return NextResponse.json(
      {
        error: "Erro ao processar pagamento",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}

