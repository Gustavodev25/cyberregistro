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
const PAYMENT_CUPOM_REGEX = /cupom(\d+)/i;

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

function extractCupomId(payment: any): number | null {
  const externalReference = String(payment.externalReference || "");
  const match = externalReference.match(PAYMENT_CUPOM_REGEX);
  if (match) {
    const parsed = Number(match[1]);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
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
  const cupomId = extractCupomId(payment);
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

    const transactionResult = await client.query(
      `INSERT INTO transactions
         (user_id, type, amount, credits_quantity, payment_method, payment_id, status, description, created_at, updated_at)
       VALUES ($1, 'credit_purchase', $2, $3, $4, $5, 'completed', $6, NOW(), NOW())
       RETURNING id`,
      [
        userId,
        amount,
        quantity,
        paymentMethod,
        paymentId,
        payment.description || null,
      ],
    );

    const transactionId = transactionResult.rows[0]?.id;

    // Se houver cupom, registrar o uso
    if (cupomId && transactionId) {
      // Buscar informações do cupom para calcular o desconto aplicado
      const cupomResult = await client.query(
        "SELECT discount_type, discount_value FROM cupons WHERE id = $1",
        [cupomId],
      );

      if (cupomResult.rows.length > 0) {
        const cupom = cupomResult.rows[0];

        // Calcular o desconto aplicado
        // Nota: Aqui estamos usando o valor original sem desconto (amount é o valor já com desconto)
        // Idealmente devemos recalcular ou armazenar o subtotal original
        let discountApplied = 0;
        if (cupom.discount_type === 'percentage') {
          // Estimar o subtotal original: total / (1 - discount/100)
          const discountFactor = 1 - (cupom.discount_value / 100);
          const originalAmount = amount / discountFactor;
          discountApplied = originalAmount - amount;
        } else {
          // Para desconto fixo, o desconto é o valor fixo
          discountApplied = cupom.discount_value;
        }

        // Registrar uso do cupom
        await client.query(
          `INSERT INTO cupons_usage
             (cupom_id, user_id, transaction_id, discount_applied, used_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [cupomId, userId, transactionId, discountApplied],
        );

        // Incrementar contador de usos
        await client.query(
          "UPDATE cupons SET uses_count = uses_count + 1 WHERE id = $1",
          [cupomId],
        );

        console.log(
          `[payments] Cupom ${cupomId} aplicado ao pagamento ${paymentId}. Desconto: R$ ${discountApplied.toFixed(2)}`,
        );
      }
    }

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
