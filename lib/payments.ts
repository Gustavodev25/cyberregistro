import pool from "./db";

export const CONFIRMED_PAYMENT_STATUSES = new Set([
  "RECEIVED",
  "RECEIVED_IN_CASH",
  "RECEIVED_OUT_OF_DATE",
  "RECEIVED_IN_ADVANCE",
  "RECEIVED_BILL",
  "CONFIRMED",
]);

const PAYMENT_USER_REGEX = /user_(\d+)_/i;
const PAYMENT_QUANTITY_REGEX = /qty(\d+)/i;
const DESCRIPTION_QUANTITY_REGEX = /(\d+)\s*cr/i;

interface PaymentConfirmationResult {
  userId: number;
  quantity: number;
  alreadyProcessed: boolean;
}

function extractUserId(payment: any): number {
  const externalReference = String(payment.externalReference || "");
  const match = externalReference.match(PAYMENT_USER_REGEX);
  if (!match) {
    throw new Error(
      `Nao foi possivel extrair userId do externalReference: ${externalReference}`,
    );
  }
  return Number(match[1]);
}

function extractQuantity(payment: any): number {
  const externalReference = String(payment.externalReference || "");
  const description = String(payment.description || "");

  const refMatch = externalReference.match(PAYMENT_QUANTITY_REGEX);
  if (refMatch) {
    const parsed = Number(refMatch[1]);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const descMatch = description.match(DESCRIPTION_QUANTITY_REGEX);
  if (descMatch) {
    const parsed = Number(descMatch[1]);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 1;
}

export function isPaymentStatusConfirmed(status: string | undefined | null) {
  if (!status) return false;
  return CONFIRMED_PAYMENT_STATUSES.has(String(status).toUpperCase());
}

export async function applyPaymentConfirmation(
  payment: any,
): Promise<PaymentConfirmationResult> {
  const userId = extractUserId(payment);
  const quantity = extractQuantity(payment);
  const amount = Number(payment.value) || 0;
  const paymentMethod =
    payment.billingType || payment.paymentMethod || "PIX";
  const paymentId = payment.id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT id FROM transactions WHERE payment_id = $1 AND status = 'completed'",
      [paymentId],
    );

    if (existing.rowCount && existing.rowCount > 0) {
      await client.query("COMMIT");
      console.log(
        `[payments] Pagamento ${paymentId} ja processado anteriormente.`,
      );
      return { userId, quantity, alreadyProcessed: true };
    }

    await client.query(
      `UPDATE usuarios
         SET credits = COALESCE(credits, 0) + $1,
             atualizado_em = NOW()
       WHERE id = $2`,
      [quantity, userId],
    );

    await client.query(
      `INSERT INTO transactions
         (user_id, type, amount, credits_quantity, payment_method, payment_id, status, description, created_at, updated_at)
       VALUES ($1, 'credit_purchase', $2, $3, $4, $5, 'completed', $6, NOW(), NOW())`,
      [
        userId,
        amount,
        quantity,
        paymentMethod,
        paymentId,
        payment.description || null,
      ],
    );

    await client.query("COMMIT");
    console.log(
      `[payments] Creditos adicionados ao usuario ${userId}: +${quantity}`,
    );
    return { userId, quantity, alreadyProcessed: false };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
