import { NextResponse } from "next/server";
import {
  checkSlot,
  indiaNow,
  isValidEmail,
  MAX_BALLS,
  MAX_SLOTS_PER_BOOKING,
  priceCart,
  type CartItem,
  type SlotId,
} from "@/lib/booking";
import { isDemoMode } from "@/lib/demo";
import { isEmailConfigured, sendMail } from "@/lib/email";
import { buildInvoice } from "@/lib/invoice";

// Test mode only: builds the invoice for a test booking, and emails it if the
// mail settings are in place. Turned off whenever test mode is off.
export async function POST(request: Request) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const now = indiaNow();
  const raw = Array.isArray(body.items) ? body.items.slice(0, MAX_SLOTS_PER_BOOKING) : [];
  const items: CartItem[] = raw
    .filter(
      (i): i is CartItem =>
        i &&
        typeof i.date === "string" &&
        typeof i.slotId === "string" &&
        Number.isInteger(i.balls) &&
        i.balls >= 0 &&
        i.balls <= MAX_BALLS &&
        typeof i.umpires === "boolean" &&
        checkSlot(i.date, i.slotId, now) === null,
    )
    .map((i) => ({ ...i, slotId: i.slotId as SlotId }));

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const phone = typeof body.phone === "string" ? body.phone.replace(/\D/g, "").slice(-10) : "";
  if (!items.length || !isValidEmail(email) || name.length < 2) {
    return NextResponse.json({ error: "Invalid details" }, { status: 400 });
  }

  const priced = priceCart(items);
  const invoice = buildInvoice({
    reference: typeof body.reference === "string" ? body.reference.slice(0, 20) : "TEST",
    issuedAt: new Date(),
    name,
    email,
    phone,
    organisation:
      typeof body.organisation === "string" && body.organisation.trim()
        ? body.organisation.trim().slice(0, 120)
        : null,
    lines: priced.lines,
    total: priced.total,
    paymentId: null,
    receiptUrl: null,
    test: true,
  });

  let sent = false;
  if (isEmailConfigured()) {
    try {
      sent = await sendMail({ to: email, ...invoice });
    } catch (error) {
      console.error("Could not send test invoice", error);
    }
  }
  return NextResponse.json({ sent, html: invoice.html });
}
