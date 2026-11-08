"use client";

import {
  Building2,
  Check,
  CreditCard,
  LoaderCircle,
  QrCode,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { formatRupees } from "@/lib/booking";

const methods = [
  { id: "upi", label: "UPI / QR", hint: "Google Pay, PhonePe, Paytm", icon: QrCode },
  { id: "card", label: "Card", hint: "Visa, Mastercard, RuPay", icon: CreditCard },
  { id: "netbanking", label: "Netbanking", hint: "All Indian banks", icon: Building2 },
  { id: "wallet", label: "Wallet", hint: "Paytm, Mobikwik and more", icon: Wallet },
];

// A stand-in for Razorpay's payment window, used only in test mode. It looks
// similar so you can see the flow, but no money moves.
export function DemoCheckout({
  amount,
  reference,
  name,
  phone,
  onSuccess,
  onClose,
}: {
  amount: number;
  reference: string;
  name: string;
  phone: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [method, setMethod] = useState("upi");
  const [state, setState] = useState<"choose" | "processing" | "failed">("choose");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function simulate(outcome: "success" | "failure") {
    setState("processing");
    setTimeout(() => {
      if (outcome === "success") onSuccess();
      else setState("failed");
    }, 1200);
  }

  function close() {
    if (state === "processing") return;
    // Razorpay also asks before closing, so a tap outside doesn't lose the payment.
    if (window.confirm("Are you sure you want to cancel this payment?")) onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Test payment"
        tabIndex={-1}
        className="w-full max-w-md overflow-hidden rounded-lg bg-white text-navy shadow-2xl outline-none"
      >
        <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-bold tracking-wide text-navy uppercase">
          Test mode · no real payment
        </div>
        <div className="flex items-start justify-between gap-4 bg-navy p-5 text-white">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-md bg-white">
              <Image src="/logo.png" alt="" width={40} height={44} />
            </span>
            <div>
              <p className="font-bold">CCS Cricket Academy</p>
              <p className="text-xs text-white/70">{reference}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close payment"
            className="grid size-9 place-items-center rounded text-white/80 hover:bg-white/10"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="flex items-baseline justify-between border-b border-navy/10 px-5 py-4">
          <span className="text-sm text-muted-foreground">Amount to pay</span>
          <span className="font-display text-3xl font-bold">{formatRupees(amount)}</span>
        </div>

        {state === "failed" ? (
          <div className="p-5 text-center">
            <p className="font-bold text-red-700">Payment failed</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your bank declined this payment. No money was taken.
            </p>
            <button
              type="button"
              onClick={() => setState("choose")}
              className="mt-5 h-12 w-full rounded bg-navy text-sm font-bold text-white"
            >
              Retry payment
            </button>
          </div>
        ) : (
          <div className="p-5">
            <p className="text-xs text-muted-foreground">
              Paying as {name} · +91 {phone}
            </p>
            <p className="mt-4 text-sm font-bold">Payment method</p>
            <ul className="mt-2 space-y-2">
              {methods.map(({ id, label, hint, icon: Icon }) => (
                <li key={id}>
                  <button
                    type="button"
                    disabled={state === "processing"}
                    onClick={() => setMethod(id)}
                    aria-pressed={method === id}
                    className={`flex w-full items-center gap-3 rounded border p-3 text-left transition-colors ${
                      method === id ? "border-navy bg-navy/5" : "border-navy/15 hover:border-navy/40"
                    }`}
                  >
                    <Icon aria-hidden className="size-5 shrink-0" />
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block text-xs text-muted-foreground">{hint}</span>
                    </span>
                    {method === id && <Check aria-hidden className="size-4" />}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={state === "processing"}
              onClick={() => simulate("success")}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded bg-navy text-sm font-bold text-white disabled:opacity-70"
            >
              {state === "processing" && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
              {state === "processing" ? "Processing…" : `Pay ${formatRupees(amount)}`}
            </button>
            <button
              type="button"
              disabled={state === "processing"}
              onClick={() => simulate("failure")}
              className="mt-2 h-10 w-full text-xs font-semibold text-muted-foreground underline disabled:opacity-50"
            >
              Test a failed payment
            </button>
          </div>
        )}
        <p className="flex items-center justify-center gap-1.5 border-t border-navy/10 py-3 text-xs text-muted-foreground">
          <ShieldCheck aria-hidden className="size-4" />
          In production this window is Razorpay&apos;s secure checkout
        </p>
      </div>
    </div>
  );
}
