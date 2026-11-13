import { createHmac, timingSafeEqual } from "node:crypto";

// RAZORPAY_API_BASE is only for automated tests against a fake server.
const apiBase = () =>
  process.env.RAZORPAY_API_BASE || "https://api.razorpay.com/v1";

export const isPaymentConfigured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

export const publicKeyId = () => process.env.RAZORPAY_KEY_ID ?? "";

// Test keys never move real money, so bookings paid with them are not real.
export const isTestMode = () =>
  (process.env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_test_");

export const ORDER_ID = /^order_[A-Za-z0-9]{6,40}$/;
export const PAYMENT_ID = /^pay_[A-Za-z0-9]{6,40}$/;

async function api<T>(path: string, body?: object): Promise<T> {
  const auth = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`,
  ).toString("base64");
  const response = await fetch(`${apiBase()}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 401) {
      // The keys are wrong, revoked, or test and live keys are mixed up.
      throw new Error(
        "Razorpay rejected the API keys. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      );
    }
    throw new Error(`Razorpay ${path} failed: ${response.status} ${detail}`);
  }
  return response.json() as Promise<T>;
}

export type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  // Paise already given back, from this site or the Razorpay dashboard.
  amount_refunded: number;
};

export type RazorpayRefund = {
  id: string;
  payment_id: string;
  amount: number;
  status: "pending" | "processed" | "failed";
};

export const createOrder = (
  amountPaise: number,
  receipt: string,
  notes: Record<string, string>,
) =>
  api<{ id: string; amount: number }>("/orders", {
    amount: amountPaise,
    currency: "INR",
    receipt,
    notes,
  });

export const fetchPayment = (paymentId: string) =>
  api<RazorpayPayment>(`/payments/${paymentId}`);

export const capturePayment = (paymentId: string, amountPaise: number) =>
  api<RazorpayPayment>(`/payments/${paymentId}/capture`, {
    amount: amountPaise,
    currency: "INR",
  });

export const refundPayment = (
  paymentId: string,
  amountPaise: number,
  reason: string,
) =>
  api<RazorpayRefund>(`/payments/${paymentId}/refund`, {
    amount: amountPaise,
    speed: "normal",
    notes: { reason },
  });

export const listRefunds = (paymentId: string) =>
  api<{ items: RazorpayRefund[] }>(`/payments/${paymentId}/refunds`);

export const REFUND_ID = /^rfnd_[A-Za-z0-9]{6,40}$/;

function matches(expected: string, actual: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Proves the payment details really came from Razorpay's checkout.
export function verifyCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return matches(expected, signature);
}

export function verifyWebhookSignature(body: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return matches(expected, signature);
}
