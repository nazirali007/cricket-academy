"use client";

import {
  ArrowLeft,
  Check,
  CircleAlert,
  LoaderCircle,
  Lock,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  BALL_PRICE,
  CHECKOUT_TIMEOUT_SECONDS,
  checkSlot,
  formatDate,
  formatRupees,
  isValidEmail,
  MAX_BALLS,
  MAX_SLOTS_PER_BOOKING,
  priceCart,
  slotKey,
  slotsFor,
  sortCart,
  UMPIRES_PRICE,
  type CartItem,
  type PricedLine,
  type Slot,
} from "@/lib/booking";
import { bookingPhone } from "@/lib/site";
import { MonthCalendar, type SlotState } from "./calendar";
import { DemoCheckout } from "./demo-checkout";
import { SlotIcon } from "./slot-icon";

const REFRESH_EVERY_MS = 20_000;
const CART_STORAGE_KEY = "ccs-ground-cart-v1";

type Availability = {
  today: string;
  nowMinutes: number;
  maxDate: string;
  online: boolean;
  demo: boolean;
  testCheckout?: boolean;
  unavailable: { date: string; slotId: string }[];
};

type Phase = "select" | "details" | "review" | "paying" | "confirming" | "done";

type Details = {
  name: string;
  phone: string;
  email: string;
  organisation: string;
};

type Outcome = {
  status: "confirmed" | "refunded" | "refund_failed" | "refunding" | "checking";
  reference: string;
  token: string;
  lines: PricedLine[];
  total: number;
};

type CheckoutResult = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (
    event: "payment.failed",
    callback: (response: { error?: { description?: string } }) => void,
  ) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let checkoutScript: Promise<boolean> | null = null;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  checkoutScript ??= new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      checkoutScript = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return checkoutScript;
}

function readCart(): CartItem[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(CART_STORAGE_KEY) ?? "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  try {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage can be blocked; the cart still works for this visit.
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

const shortDate = (date: string) =>
  formatDate(date, { weekday: "short", day: "numeric", month: "short" });

const lineLabel = (line: { date: string; slotName?: string; slotId: string }) =>
  `${shortDate(line.date)}, ${line.slotName ?? line.slotId}`;

function addOnText(line: PricedLine) {
  const parts = [];
  if (line.balls > 0) {
    parts.push(
      `${line.balls} ball${line.balls === 1 ? "" : "s"} × ${formatRupees(BALL_PRICE)} = ${formatRupees(line.ballsCost)}`,
    );
  }
  if (line.umpires) parts.push(`Umpires ${formatRupees(UMPIRES_PRICE)}`);
  return parts;
}

const inputClass =
  "mt-1.5 h-12 w-full border border-navy/25 bg-white px-4 text-navy outline-none transition-colors focus:border-ball focus:ring-1 focus:ring-ball";

function Steps({ phase }: { phase: Phase }) {
  const current = phase === "select" ? 0 : phase === "details" ? 1 : 2;
  const steps = ["Choose slots", "Your details", "Review & pay"];
  return (
    <ol className="flex gap-2 text-xs font-bold uppercase" aria-label="Booking steps">
      {steps.map((step, i) => (
        <li
          key={step}
          aria-current={i === current ? "step" : undefined}
          className={`flex-1 border-b-4 pb-2 ${
            i < current
              ? "border-emerald-600 text-navy"
              : i === current
                ? "border-ball text-navy"
                : "border-navy/15 text-navy/45"
          }`}
        >
          {i + 1}. {step}
        </li>
      ))}
    </ol>
  );
}

export function BookingApp() {
  const [data, setData] = useState<Availability | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("select");
  const [details, setDetails] = useState<Details>({
    name: "",
    phone: "",
    email: "",
    organisation: "",
  });
  // Test mode only: what happened to the test invoice email.
  const [demoInvoice, setDemoInvoice] = useState<{ sent: boolean; html: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [holdUntil, setHoldUntil] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // Test mode only: bookings kept in memory, so a refresh clears them.
  const [demoBooked, setDemoBooked] = useState<string[]>([]);
  const [demoPayment, setDemoPayment] = useState<{
    reference: string;
    lines: PricedLine[];
    total: number;
  } | null>(null);

  const restored = useRef(false);
  const itemsRef = useRef<CartItem[]>([]);
  const phaseRef = useRef<Phase>("select");
  const settled = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef<HTMLHeadingElement>(null);

  const goTo = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  // Keeps the chart current while the page is open, and drops any slot in the
  // basket that someone else has booked or that has started.
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/slots", { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      const next: Availability = await response.json();
      setData(next);
      setLoadFailed(false);

      const taken = new Set(next.unavailable.map((u) => slotKey(u.date, u.slotId)));
      const now = { today: next.today, minutes: next.nowMinutes };
      const stillValid = (item: CartItem) =>
        !taken.has(slotKey(item.date, item.slotId)) &&
        checkSlot(item.date, item.slotId, now) === null;

      // In test mode nothing is restored, so a refresh starts clean.
      const base = restored.current
        ? itemsRef.current
        : next.demo
          ? []
          : readCart();
      restored.current = true;
      // During payment the customer's own hold shows as taken, so leave it.
      if (["paying", "confirming", "done"].includes(phaseRef.current)) return;
      const kept = base.filter(stillValid);
      const lost = base.filter((item) => !stillValid(item));
      if (lost.length || base !== itemsRef.current) {
        itemsRef.current = kept;
        setItems(kept);
      }
      if (lost.length) {
        setNotice(
          `${lost.length === 1 ? "This slot is" : "These slots are"} no longer available and ${lost.length === 1 ? "was" : "were"} removed: ${priceCart(lost).lines.map(lineLabel).join("; ")}.`,
        );
        if (kept.length === 0 && phaseRef.current !== "select") {
          phaseRef.current = "select";
          setPhase("select");
        }
      }
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(load, REFRESH_EVERY_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  useEffect(() => {
    itemsRef.current = items;
    if (restored.current && !data?.demo) saveCart(items);
  }, [items, data?.demo]);

  if (!data) {
    return (
      <div
        id="pick-a-slot"
        className="grid min-h-64 scroll-mt-24 place-items-center border border-white/15 bg-navy/50 p-8 text-center text-white/80"
      >
        {loadFailed ? (
          <p>
            We couldn&apos;t load availability. Please refresh the page, or call{" "}
            <a href={`tel:${bookingPhone.replace(/\s/g, "")}`} className="underline">
              {bookingPhone}
            </a>
            .
          </p>
        ) : (
          <span className="flex items-center gap-3">
            <LoaderCircle aria-hidden className="size-5 animate-spin" />
            Loading availability…
          </span>
        )}
      </div>
    );
  }

  const { today, nowMinutes, maxDate, online, demo, testCheckout = false } = data;
  const canBook = online || demo;
  const now = { today, minutes: nowMinutes };
  const taken = new Set([
    ...data.unavailable.map((u) => slotKey(u.date, u.slotId)),
    ...demoBooked,
  ]);
  const inCart = new Set(items.map((i) => slotKey(i.date, i.slotId)));
  const editable = phase === "select" && canBook;

  const stateOf = (date: string, slot: Slot): SlotState => {
    const key = slotKey(date, slot.id);
    if (inCart.has(key)) return "selected";
    if (taken.has(key)) return "booked";
    if (checkSlot(date, slot.id, now)) return "closed";
    return "available";
  };

  const dayHasSpace = (date: string) =>
    slotsFor(date).some((slot) => stateOf(date, slot) === "available");
  let firstOpenDay = today;
  for (let i = 0; i < 90; i++) {
    const day = new Date(`${today}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() + i);
    const iso = day.toISOString().slice(0, 10);
    if (dayHasSpace(iso)) {
      firstOpenDay = iso;
      break;
    }
  }
  // Opens on the date being booked, or else the first day with a free slot.
  const date =
    chosenDate && chosenDate >= today && chosenDate <= maxDate
      ? chosenDate
      : (sortCart(items)[0]?.date ?? firstOpenDay);
  const shownMonth = month ?? date.slice(0, 7);
  const priced = priceCart(items);
  const full = items.length >= MAX_SLOTS_PER_BOOKING;

  function chooseDate(next: string) {
    setChosenDate(next);
    setMonth(next.slice(0, 7));
    // Bring that day's slots into view, after React has drawn them. Skipped
    // when they're already fully on screen, as on wide screens.
    requestAnimationFrame(() => {
      const heading = slotsRef.current;
      if (!heading) return;
      const list = document.getElementById("day-slots");
      const top = heading.getBoundingClientRect().top;
      const bottom = (list ?? heading).getBoundingClientRect().bottom;
      if (top >= 80 && bottom <= window.innerHeight) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      heading.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    });
  }

  function toggleSlot(slot: Slot) {
    if (!editable) return;
    const key = slotKey(date, slot.id);
    setNotice(null);
    setError(null);
    if (inCart.has(key)) {
      setItems(items.filter((i) => slotKey(i.date, i.slotId) !== key));
      return;
    }
    if (stateOf(date, slot) !== "available" || full) return;
    setChosenDate(date);
    setItems(sortCart([...items, { date, slotId: slot.id, balls: 0, umpires: false }]));
  }

  function updateItem(key: string, patch: Partial<CartItem>) {
    setItems(
      items.map((item) =>
        slotKey(item.date, item.slotId) === key ? { ...item, ...patch } : item,
      ),
    );
  }

  function removeItem(key: string) {
    setItems(items.filter((item) => slotKey(item.date, item.slotId) !== key));
  }

  function scrollToPanel() {
    panelRef.current?.scrollIntoView({ block: "start" });
  }

  function submitDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = {
      name: String(form.get("name") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      email: String(form.get("email") ?? "").trim().toLowerCase(),
      organisation: String(form.get("organisation") ?? "").trim(),
    };
    const digits = next.phone.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
    if (next.name.length < 2) return setError("Please enter your name.");
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return setError("Please enter a valid 10-digit mobile number.");
    }
    if (!isValidEmail(next.email)) {
      return setError("Please enter a valid email address for your invoice.");
    }
    setDetails({ ...next, phone: digits });
    setError(null);
    goTo("review");
    scrollToPanel();
  }

  async function release(token: string) {
    try {
      await fetch("/api/bookings/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        keepalive: true,
      });
    } catch {
      // The hold expires on its own if this fails.
    }
  }

  async function checkStatus(token: string, reference: string, snapshot: { lines: PricedLine[]; total: number }) {
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        const response = await fetch(`/api/bookings/status?token=${token}`, { cache: "no-store" });
        if (response.ok) {
          const { status } = await response.json();
          if (status === "confirmed" || status === "refunded" || status === "refund_failed") {
            return setOutcome({ status, reference, token, ...snapshot });
          }
        }
      } catch {
        // Keep trying.
      }
      await sleep(3000);
    }
    setOutcome({ status: "checking", reference, token, ...snapshot });
  }

  async function confirmPayment(
    token: string,
    reference: string,
    snapshot: { lines: PricedLine[]; total: number },
    response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
  ) {
    settled.current = true;
    goTo("confirming");
    setItems([]);
    try {
      const result = await fetch("/api/bookings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        }),
      });
      const body = await result.json().catch(() => ({}));
      if (result.ok && body.status) {
        setOutcome({ status: body.status, reference, token, ...snapshot });
      } else {
        await checkStatus(token, reference, snapshot);
      }
    } catch {
      await checkStatus(token, reference, snapshot);
    }
    goTo("done");
    load();
  }

  // Opens Razorpay's payment window. Used for live payments and, in test
  // mode, for Razorpay's test checkout.
  function openRazorpay(options: {
    keyId: unknown;
    amount: unknown;
    orderId: unknown;
    reference: string;
    lineCount: number;
    onDismiss: (failure: string | null) => void;
    onSuccess: (result: CheckoutResult) => void;
  }) {
    if (!window.Razorpay) return;
    // Razorpay shows a failed attempt inside its window and lets the customer
    // try again there. If they give up, the reason is shown on the page.
    let failure: string | null = null;
    const checkout = new window.Razorpay({
      key: options.keyId,
      amount: options.amount,
      currency: "INR",
      order_id: options.orderId,
      name: "CCS Cricket Academy",
      description: `${options.lineCount} ground slot${options.lineCount === 1 ? "" : "s"} · ${options.reference}`,
      image: `${window.location.origin}/logo.png`,
      prefill: { name: details.name, email: details.email, contact: `+91${details.phone}` },
      notes: { reference: options.reference },
      theme: { color: "#071a2c" },
      timeout: CHECKOUT_TIMEOUT_SECONDS,
      retry: { enabled: true },
      modal: {
        confirm_close: true,
        escape: false,
        ondismiss: () => {
          if (!settled.current) options.onDismiss(failure);
        },
      },
      handler: options.onSuccess,
    });
    checkout.on("payment.failed", (response) => {
      const reason = response.error?.description?.trim();
      failure = reason ? (/[.!?]$/.test(reason) ? reason : `${reason}.`) : "The bank declined it.";
    });
    checkout.open();
  }

  const failedMessage = (failure: string, released: boolean) =>
    `Payment failed: ${failure}${released ? " Your slots were released." : ""} You can try again or use another payment method. If money left your account, your bank returns it automatically.`;

  async function pay() {
    if (busy || items.length === 0) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const snapshot = priceCart(items);
    const customer = {
      name: details.name,
      phone: details.phone,
      email: details.email,
      organisation: details.organisation,
    };
    const cart = snapshot.lines.map(({ date, slotId, balls, umpires }) => ({
      date,
      slotId,
      balls,
      umpires,
    }));

    if (demo) {
      // Nothing is saved in test mode.
      const clash = snapshot.lines.filter((l) => taken.has(slotKey(l.date, l.slotId)));
      if (clash.length) {
        setBusy(false);
        setItems(items.filter((i) => !taken.has(slotKey(i.date, i.slotId))));
        setNotice(`Sorry, ${clash.map(lineLabel).join("; ")} is no longer available.`);
        return goTo("select");
      }
      if (testCheckout) return payWithTestCheckout(snapshot, cart, customer);
      setBusy(false);
      setDemoPayment({
        reference: `TEST-${String(Date.now()).slice(-5)}`,
        lines: snapshot.lines,
        total: snapshot.total,
      });
      return goTo("paying");
    }

    let response: Response;
    let body: Record<string, unknown>;
    try {
      response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          expectedTotal: snapshot.total,
          ...customer,
          website: (document.getElementById("booking-website") as HTMLInputElement | null)?.value ?? "",
        }),
      });
      body = await response.json().catch(() => ({}));
    } catch {
      setBusy(false);
      return setError("Please check your internet connection and try again.");
    }

    if (!response.ok) {
      setBusy(false);
      if (body.code === "taken" && Array.isArray(body.taken)) {
        const lost = new Set(body.taken as string[]);
        const removed = snapshot.lines.filter((l) => lost.has(slotKey(l.date, l.slotId)));
        setItems(items.filter((i) => !lost.has(slotKey(i.date, i.slotId))));
        setNotice(
          removed.length
            ? `Sorry, ${removed.map(lineLabel).join("; ")} ${removed.length === 1 ? "was" : "were"} just booked by someone else and removed from your booking. Please check your slots and try again.`
            : "Some slots were just booked by someone else. Please check your slots and try again.",
        );
        goTo("select");
        load();
        return;
      }
      if (body.code === "price_changed") {
        return setError("Our rates have been updated. Please refresh the page to see the new prices.");
      }
      return setError(typeof body.error === "string" ? body.error : "Something went wrong. Please try again.");
    }

    const token = String(body.token);
    const reference = String(body.reference);
    if (!(await loadCheckout()) || !window.Razorpay) {
      await release(token);
      setBusy(false);
      return setError(
        "We couldn't open the payment window. Please check your connection, turn off any ad blocker for this site, and try again.",
      );
    }

    settled.current = false;
    setHoldUntil(String(body.expiresAt));
    goTo("paying");
    setBusy(false);

    openRazorpay({
      keyId: body.keyId,
      amount: body.amount,
      orderId: body.orderId,
      reference,
      lineCount: snapshot.lines.length,
      onDismiss: async (failure) => {
        await release(token);
        goTo("review");
        setError(
          failure
            ? failedMessage(failure, true)
            : "Payment wasn't completed, so your slots were released. You can try again.",
        );
        load();
      },
      onSuccess: (result) => confirmPayment(token, reference, snapshot, result),
    });
  }

  // Test mode with Razorpay test keys: a real Razorpay test order and checkout,
  // checked on the server, but nothing is saved.
  async function payWithTestCheckout(
    snapshot: ReturnType<typeof priceCart>,
    cart: CartItem[],
    customer: Details,
  ) {
    let response: Response;
    let body: Record<string, unknown>;
    try {
      response = await fetch("/api/demo/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart, expectedTotal: snapshot.total, ...customer }),
      });
      body = await response.json().catch(() => ({}));
    } catch {
      setBusy(false);
      return setError("Please check your internet connection and try again.");
    }
    if (!response.ok) {
      setBusy(false);
      if (body.code === "price_changed") {
        return setError("Our rates have been updated. Please refresh the page to see the new prices.");
      }
      return setError(typeof body.error === "string" ? body.error : "Something went wrong. Please try again.");
    }

    const reference = String(body.reference);
    if (!(await loadCheckout()) || !window.Razorpay) {
      setBusy(false);
      return setError(
        "We couldn't open the payment window. Please check your connection, turn off any ad blocker for this site, and try again.",
      );
    }

    settled.current = false;
    setHoldUntil(null);
    goTo("paying");
    setBusy(false);

    openRazorpay({
      keyId: body.keyId,
      amount: body.amount,
      orderId: body.orderId,
      reference,
      lineCount: snapshot.lines.length,
      onDismiss: (failure) => {
        goTo("review");
        setError(failure ? failedMessage(failure, false) : "Payment wasn't completed. You can try again.");
      },
      onSuccess: async (result) => {
        settled.current = true;
        goTo("confirming");
        let message = "We couldn't confirm this test payment. Please try again.";
        try {
          const check = await fetch("/api/demo/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: result.razorpay_order_id,
              paymentId: result.razorpay_payment_id,
              signature: result.razorpay_signature,
            }),
          });
          const verdict = await check.json().catch(() => ({}));
          if (check.ok && verdict.status === "confirmed") {
            return finishDemoPayment({
              reference,
              lines: snapshot.lines,
              total: snapshot.total,
            });
          }
          if (typeof verdict.error === "string") message = verdict.error;
        } catch {
          message = "Please check your internet connection and try again.";
        }
        goTo("review");
        setError(message);
      },
    });
  }

  function finishDemoPayment(payment: { reference: string; lines: PricedLine[]; total: number }) {
    const { reference, lines, total } = payment;
    setDemoBooked((booked) => [
      ...booked,
      ...lines.map((l) => slotKey(l.date, l.slotId)),
    ]);
    setDemoPayment(null);
    setItems([]);
    setDemoInvoice(null);
    setOutcome({ status: "confirmed", reference, token: "", lines, total });
    goTo("done");
    fetch("/api/demo/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference,
        items: lines.map(({ date, slotId, balls, umpires }) => ({ date, slotId, balls, umpires })),
        ...details,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((result) => result && setDemoInvoice(result))
      .catch(() => {});
  }

  function previewInvoice() {
    if (!demoInvoice) return;
    const url = URL.createObjectURL(new Blob([demoInvoice.html], { type: "text/html;charset=utf-8" }));
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function cancelDemoPayment() {
    setDemoPayment(null);
    goTo("review");
    setError("Payment wasn't completed, so your slots were released. You can try again.");
  }

  function startOver() {
    setOutcome(null);
    setError(null);
    setNotice(null);
    goTo("select");
  }

  const slots = slotsFor(date);

  return (
    <div id="pick-a-slot" className="grid scroll-mt-24 gap-8 lg:grid-cols-[1.35fr_1fr]">
      <div className="min-w-0">
        {demo && (
          <p role="status" className="mb-6 border-2 border-amber-400 bg-amber-400/15 p-4">
            <strong className="text-amber-300">Test mode.</strong> Try the whole
            booking and payment flow. Nothing is saved and no money is taken.
            {testCheckout &&
              " Payments open Razorpay's real test checkout, so pay with Razorpay's test card or UPI details."}{" "}
            Refresh the page to clear your test bookings.
          </p>
        )}
        {!canBook && (
          <p role="status" className="mb-6 border border-gold/60 bg-gold/10 p-4">
            Online booking isn&apos;t available right now. You can still check which
            slots are free, and call{" "}
            <a href={`tel:${bookingPhone.replace(/\s/g, "")}`} className="font-bold underline">
              {bookingPhone}
            </a>{" "}
            to book.
          </p>
        )}

        <h3 className="font-display text-3xl font-bold uppercase">Pick a date</h3>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-2 w-4 rounded-full bg-emerald-400" />
            Available
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-2 w-4 rounded-full bg-red-500" />
            Booked
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-2 w-4 rounded-full bg-gold" />
            Your choice
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="size-3.5 border-2 border-gold bg-gold/25" />
            Date with your slots
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-2 w-4 rounded-full bg-white/25" />
            Closed
          </li>
        </ul>
        <p className="mt-2 text-sm text-white/70">
          Each bar under a date is one slot, from morning to night.
        </p>

        <div className="mt-5">
          <MonthCalendar
            month={shownMonth}
            onMonthChange={setMonth}
            today={today}
            maxDate={maxDate}
            selectedDate={date}
            onSelectDate={chooseDate}
            statesFor={(day) => slotsFor(day).map((slot) => stateOf(day, slot))}
            chosenCount={(day) => items.filter((i) => i.date === day).length}
          />
        </div>

        <h3
          ref={slotsRef}
          className="mt-10 scroll-mt-24 font-display text-3xl font-bold uppercase"
        >
          Slots on {formatDate(date, { weekday: "long", day: "numeric", month: "long" })}
        </h3>
        <p className="mt-1 text-white/75">
          {editable
            ? "Tap a green slot to add it. You can add slots from different dates."
            : canBook
              ? "Go back to step 1 to change your slots."
              : "Booked slots are shown in red."}
        </p>

        <motion.ul
          key={date}
          id="day-slots"
          className="mt-5 grid gap-3 sm:grid-cols-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {slots.map((slot) => {
            const state = stateOf(date, slot);
            const clickable =
              editable && (state === "selected" || (state === "available" && !full));
            return (
              <li key={slot.id}>
                <button
                  type="button"
                  disabled={!clickable}
                  aria-pressed={state === "selected"}
                  onClick={() => toggleSlot(slot)}
                  className={`h-full w-full border-2 p-5 text-left transition-colors duration-200 ${
                    state === "selected"
                      ? "border-gold bg-gold/20"
                      : state === "available"
                        ? "border-emerald-400/70 bg-emerald-500/12 enabled:hover:bg-emerald-500/22"
                        : state === "booked"
                          ? "border-red-400/70 bg-red-600/18"
                          : "border-white/15 bg-white/5 opacity-60"
                  } ${clickable ? "cursor-pointer" : "cursor-not-allowed"}`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <SlotIcon id={slot.id} className="size-8 text-gold" />
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold uppercase ${
                        state === "selected"
                          ? "bg-gold text-navy"
                          : state === "available"
                            ? "bg-emerald-400 text-navy"
                            : state === "booked"
                              ? "bg-red-600 text-white"
                              : "bg-white/15 text-white"
                      }`}
                    >
                      {state === "selected" && <Check aria-hidden className="size-3.5" />}
                      {state === "selected"
                        ? "Added"
                        : state === "available"
                          ? "Available"
                          : state === "booked"
                            ? "Booked"
                            : "Closed"}
                    </span>
                  </span>
                  <span className="mt-4 block font-display text-3xl font-bold uppercase">
                    {slot.name}
                  </span>
                  <span className="mt-1 block text-sm text-white/85">{slot.timing}</span>
                  <span className="mt-3 block font-display text-3xl font-bold">
                    {formatRupees(slot.rate)}
                  </span>
                  {editable && state === "available" && (
                    <span className="mt-2 block text-sm font-semibold text-emerald-300">
                      {full ? `Limit of ${MAX_SLOTS_PER_BOOKING} slots reached` : "+ Add to booking"}
                    </span>
                  )}
                  {editable && state === "selected" && (
                    <span className="mt-2 block text-sm font-semibold text-gold">
                      Tap again to remove
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </motion.ul>
      </div>

      <div ref={panelRef} className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
        <div className="bg-cream p-6 text-navy md:p-8">
          {phase !== "done" && phase !== "confirming" && phase !== "paying" && <Steps phase={phase} />}

          {notice && (
            <p role="alert" className="mt-5 flex gap-2 border-l-4 border-ball bg-red-50 p-3 text-sm font-semibold text-red-800">
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              {notice}
            </p>
          )}

          {phase === "select" && (
            <div className="mt-6">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-3xl font-bold uppercase">Your slots</h3>
                <span className="text-sm font-semibold text-muted-foreground">
                  {items.length} of {MAX_SLOTS_PER_BOOKING} max
                </span>
              </div>

              {items.length === 0 ? (
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  No slots added yet. Pick a date, then tap a green slot to add it.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-navy/15 border-y border-navy/15">
                  {priced.lines.map((line) => {
                    const key = slotKey(line.date, line.slotId);
                    return (
                      <li key={key} className="py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold">{shortDate(line.date)}</p>
                            <p className="text-sm text-muted-foreground">
                              {line.slotName}, {line.timing}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{formatRupees(line.rate)}</span>
                            <button
                              type="button"
                              onClick={() => removeItem(key)}
                              aria-label={`Remove ${lineLabel(line)}`}
                              className="grid size-9 place-items-center text-muted-foreground hover:text-ball"
                            >
                              <X aria-hidden className="size-4" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span>Balls ({formatRupees(BALL_PRICE)} each)</span>
                            <button
                              type="button"
                              aria-label={`Fewer balls for ${lineLabel(line)}`}
                              disabled={line.balls === 0}
                              onClick={() => updateItem(key, { balls: line.balls - 1 })}
                              className="grid size-9 place-items-center border border-navy/30 disabled:opacity-35"
                            >
                              <Minus aria-hidden className="size-3.5" />
                            </button>
                            <span aria-live="polite" className="w-5 text-center font-bold">
                              {line.balls}
                            </span>
                            <button
                              type="button"
                              aria-label={`More balls for ${lineLabel(line)}`}
                              disabled={line.balls >= MAX_BALLS}
                              onClick={() => updateItem(key, { balls: line.balls + 1 })}
                              className="grid size-9 place-items-center border border-navy/30 disabled:opacity-35"
                            >
                              <Plus aria-hidden className="size-3.5" />
                            </button>
                          </div>
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={line.umpires}
                              onChange={(e) => updateItem(key, { umpires: e.target.checked })}
                              className="size-5 accent-ball"
                            />
                            2 umpires ({formatRupees(UMPIRES_PRICE)})
                          </label>
                        </div>
                        {line.total !== line.rate && (
                          <p className="mt-2 text-right text-sm font-semibold">
                            Slot total {formatRupees(line.total)}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-5 flex items-baseline justify-between">
                <span className="font-semibold">
                  Total for {items.length} slot{items.length === 1 ? "" : "s"}
                </span>
                <motion.span
                  key={priced.total}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="font-display text-4xl font-bold"
                >
                  {formatRupees(priced.total)}
                </motion.span>
              </div>
              <button
                type="button"
                disabled={items.length === 0 || !canBook}
                onClick={() => {
                  setNotice(null);
                  goTo("details");
                  scrollToPanel();
                }}
                className="mt-5 h-13 w-full bg-ball text-sm font-bold text-white transition-colors hover:bg-[#a81f18] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {items.length > 1 ? `Book ${items.length} slots` : "Book this slot"}
              </button>
            </div>
          )}

          {phase === "details" && (
            <form onSubmit={submitDetails} noValidate className="mt-6">
              <h3 className="font-display text-3xl font-bold uppercase">Your details</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                We&apos;ll use these to contact you about your booking.
              </p>
              <div className="mt-5 space-y-4">
                <label className="block text-sm font-semibold">
                  Full name
                  <input
                    name="name"
                    required
                    maxLength={80}
                    autoComplete="name"
                    defaultValue={details.name}
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Mobile number
                  <input
                    name="phone"
                    required
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="10-digit number"
                    defaultValue={details.phone}
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Email for your invoice
                  <input
                    name="email"
                    required
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={254}
                    placeholder="you@example.com"
                    defaultValue={details.email}
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Company or team (optional)
                  <input
                    name="organisation"
                    maxLength={120}
                    autoComplete="organization"
                    defaultValue={details.organisation}
                    className={inputClass}
                  />
                </label>
              </div>
              {error && (
                <p role="alert" className="mt-4 text-sm font-semibold text-red-700">
                  {error}
                </p>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    goTo("select");
                  }}
                  className="flex h-13 items-center gap-2 border border-navy/30 px-5 text-sm font-bold"
                >
                  <ArrowLeft aria-hidden className="size-4" /> Back
                </button>
                <button
                  type="submit"
                  className="h-13 flex-1 bg-ball text-sm font-bold text-white transition-colors hover:bg-[#a81f18]"
                >
                  Next
                </button>
              </div>
            </form>
          )}

          {phase === "review" && (
            <div className="mt-6">
              <h3 className="font-display text-3xl font-bold uppercase">Check and pay</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Please check everything before you pay.
              </p>

              <table className="mt-5 w-full border-collapse text-left text-sm">
                <caption className="sr-only">Price breakup</caption>
                <thead>
                  <tr className="border-b-2 border-navy text-xs uppercase">
                    <th scope="col" className="pb-2">Slot</th>
                    <th scope="col" className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {priced.lines.map((line) => (
                    <tr key={slotKey(line.date, line.slotId)} className="border-b border-navy/15 align-top">
                      <td className="py-3 pr-3">
                        <p className="font-bold">{formatDate(line.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>
                        <p>
                          {line.slotName}, {line.timing}
                        </p>
                        <p className="text-muted-foreground">Ground {formatRupees(line.rate)}</p>
                        {addOnText(line).map((text) => (
                          <p key={text} className="text-muted-foreground">
                            {text}
                          </p>
                        ))}
                      </td>
                      <td className="py-3 text-right font-bold whitespace-nowrap">
                        {formatRupees(line.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" className="pt-3 font-normal">
                      Ground ({priced.lines.length} slot{priced.lines.length === 1 ? "" : "s"})
                    </th>
                    <td className="pt-3 text-right">{formatRupees(priced.groundTotal)}</td>
                  </tr>
                  <tr>
                    <th scope="row" className="font-normal">Balls and umpires</th>
                    <td className="text-right">{formatRupees(priced.addOnsTotal)}</td>
                  </tr>
                  <tr className="text-lg">
                    <th scope="row" className="pt-3">Total to pay</th>
                    <td className="pt-3 text-right font-display text-4xl font-bold">
                      {formatRupees(priced.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <dl className="mt-6 space-y-1 border-t border-navy/15 pt-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="text-right font-semibold">{details.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Mobile</dt>
                  <dd className="font-semibold">+91 {details.phone}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Invoice to</dt>
                  <dd className="text-right font-semibold break-all">{details.email}</dd>
                </div>
                {details.organisation && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Company or team</dt>
                    <dd className="text-right font-semibold">{details.organisation}</dd>
                  </div>
                )}
              </dl>

              <div className="mt-5 space-y-2 bg-mist p-3 text-sm leading-relaxed">
                <p>
                  <strong>No refunds after booking.</strong> If you cancel, the
                  amount isn&apos;t refunded. If the academy cancels your match,
                  you get a 100% refund.
                </p>
                <p>
                  When you press Pay, your slots are held for you while you
                  complete the payment. No extra charges are added to this total.
                </p>
                <p>
                  By paying, you agree to our{" "}
                  <Link href="/terms" target="_blank" className="font-semibold underline">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/refund-policy" target="_blank" className="font-semibold underline">
                    Refund &amp; Cancellation Policy
                  </Link>
                  .
                </p>
              </div>

              <input
                id="booking-website"
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                className="absolute -left-[9999px] size-px"
              />

              {error && (
                <p role="alert" className="mt-4 text-sm font-semibold text-red-700">
                  {error}
                </p>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setError(null);
                    goTo("details");
                  }}
                  className="flex h-13 items-center gap-2 border border-navy/30 px-5 text-sm font-bold disabled:opacity-40"
                >
                  <ArrowLeft aria-hidden className="size-4" /> Edit
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={pay}
                  className="flex h-13 flex-1 items-center justify-center gap-2 bg-ball text-sm font-bold text-white transition-colors hover:bg-[#a81f18] disabled:opacity-70"
                >
                  {busy ? (
                    <LoaderCircle aria-hidden className="size-4 animate-spin" />
                  ) : (
                    <Lock aria-hidden className="size-4" />
                  )}
                  {busy ? "Reserving your slots…" : `Pay ${formatRupees(priced.total)}`}
                </button>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Secure payment by Razorpay: UPI, cards, net banking and wallets.
              </p>
            </div>
          )}

          {phase === "paying" && (
            <div role="status" className="py-4 text-center">
              <LoaderCircle aria-hidden className="mx-auto size-8 animate-spin" />
              <h3 className="mt-4 font-display text-3xl font-bold uppercase">
                Complete your payment
              </h3>
              <p className="mt-2 text-muted-foreground">
                Finish paying in the Razorpay window.
                {holdUntil && ` Your slots are held until ${timeOf(holdUntil)}.`}
              </p>
            </div>
          )}

          {phase === "confirming" && (
            <div role="status" className="py-4 text-center">
              <LoaderCircle aria-hidden className="mx-auto size-8 animate-spin" />
              <h3 className="mt-4 font-display text-3xl font-bold uppercase">
                Confirming your payment
              </h3>
              <p className="mt-2 text-muted-foreground">Please don&apos;t close this page.</p>
            </div>
          )}

          {phase === "done" && outcome && (
            <div role="status">
              {outcome.status === "confirmed" ? (
                <>
                  <span className="grid size-14 place-items-center rounded-full bg-emerald-600 text-white">
                    <Check aria-hidden className="size-8" />
                  </span>
                  <h3 className="mt-5 font-display text-4xl leading-none font-bold uppercase">
                    Booking confirmed
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    Payment received. Your reference is{" "}
                    <strong className="text-navy">{outcome.reference}</strong>.
                    {outcome.token && (
                      <>
                        {" "}Your invoice is on its way to{" "}
                        <strong className="text-navy break-all">{details.email}</strong>.
                      </>
                    )}
                  </p>
                </>
              ) : outcome.status === "checking" ? (
                <>
                  <h3 className="font-display text-4xl leading-none font-bold uppercase">
                    We&apos;re confirming your payment
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    This is taking longer than usual. Your booking page below will
                    update once it&apos;s confirmed. If money was taken and it
                    doesn&apos;t confirm, call {bookingPhone} with reference{" "}
                    <strong className="text-navy">{outcome.reference}</strong>.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="font-display text-4xl leading-none font-bold uppercase">
                    Slot no longer available
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    {outcome.status === "refunded"
                      ? "Your payment arrived after your hold ended and someone else had booked a slot. Your full payment has been refunded and should reach you in 5–7 working days."
                      : `Your payment arrived after your hold ended and someone else had booked a slot. We're refunding your payment in full. If you have questions, call ${bookingPhone} with reference ${outcome.reference}.`}
                  </p>
                </>
              )}

              <ul className="mt-5 divide-y divide-navy/15 border-y border-navy/15 text-sm">
                {outcome.lines.map((line) => (
                  <li key={slotKey(line.date, line.slotId)} className="flex justify-between gap-3 py-2">
                    <span>
                      {shortDate(line.date)}, {line.slotName} ({line.timing})
                    </span>
                    <span className="font-semibold">{formatRupees(line.total)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex justify-between font-bold">
                <span>{outcome.status === "confirmed" ? "Paid" : "Amount"}</span>
                <span>{formatRupees(outcome.total)}</span>
              </p>

              {outcome.token ? (
                <Link
                  href={`/booking/${outcome.token}`}
                  className="mt-6 flex h-12 items-center justify-center bg-navy text-sm font-bold text-white"
                >
                  View and save your booking
                </Link>
              ) : (
                <div className="mt-6 space-y-3 bg-amber-100 p-3 text-sm font-semibold text-amber-900">
                  <p>
                    Test booking: these slots now show as Booked until you refresh
                    the page.
                  </p>
                  <p role="status">
                    {!demoInvoice
                      ? "Preparing your invoice…"
                      : demoInvoice.sent
                        ? `Test invoice emailed to ${details.email}.`
                        : `On the live site the invoice is emailed to ${details.email}. Email isn't set up on this computer, so preview it instead.`}
                  </p>
                  {demoInvoice && (
                    <button
                      type="button"
                      onClick={previewInvoice}
                      className="h-10 w-full bg-navy text-sm font-bold text-white"
                    >
                      Preview invoice email
                    </button>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={startOver}
                className="mt-3 h-12 w-full border border-navy/30 text-sm font-bold"
              >
                Book more slots
              </button>
            </div>
          )}
        </div>
      </div>

      {demoPayment && (
        <DemoCheckout
          amount={demoPayment.total}
          reference={demoPayment.reference}
          name={details.name}
          phone={details.phone}
          onSuccess={() => demoPayment && finishDemoPayment(demoPayment)}
          onClose={cancelDemoPayment}
        />
      )}

      {phase === "select" && items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-white/15 bg-navy/97 px-5 py-3 text-white backdrop-blur lg:hidden">
          <div>
            <p className="text-xs text-white/70">
              {items.length} slot{items.length === 1 ? "" : "s"} added
            </p>
            <p className="font-display text-2xl font-bold">{formatRupees(priced.total)}</p>
          </div>
          <button
            type="button"
            onClick={scrollToPanel}
            className="h-11 bg-ball px-5 text-sm font-bold"
          >
            Review slots
          </button>
        </div>
      )}
    </div>
  );
}
