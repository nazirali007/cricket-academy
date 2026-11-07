import { createHmac, timingSafeEqual } from "node:crypto";

// RAZORPAY_API_BASE is only for automated tests against a fake server.
const apiBase = () =>
  process.env.RAZORPAY_API_BASE || "https://api.razorpay.com/v1";

export const isPaymentConfigured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

export const publicKeyId = () => process.env.RAZORPAY_KEY_ID ?? "";

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
    throw new Error(`Razorpay ${path} failed: ${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

export type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
};

export const createOrder = (amountPaise: number, receipt: string, bookingId: number) =>
  api<{ id: string; amount: number }>("/orders", {
    amount: amountPaise,
    currency: "INR",
    receipt,
    notes: { booking_id: String(bookingId) },
  });

export const fetchPayment = (paymentId: string) =>
  api<RazorpayPayment>(`/payments/${paymentId}`);

export const capturePayment = (paymentId: string, amountPaise: number) =>
  api<RazorpayPayment>(`/payments/${paymentId}/capture`, {
    amount: amountPaise,
    currency: "INR",
  });

export const refundPayment = (paymentId: string, amountPaise: number) =>
  api<{ id: string }>(`/payments/${paymentId}/refund`, {
    amount: amountPaise,
    notes: { reason: "Slot was no longer available when payment arrived" },
  });

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
