"use client";

import { cancelBooking, resendInvoice, retryRefund } from "./actions";

export function CancelButton({
  id,
  label,
  paid,
}: {
  id: number;
  label: string;
  paid: boolean;
}) {
  return (
    <form
      action={cancelBooking}
      onSubmit={(event) => {
        const message = paid
          ? `Cancel ${label} and refund it? The academy is cancelling, so the customer gets a FULL refund through Razorpay now (it reaches them in 5–7 working days), and the slots become available again. This can't be undone.`
          : `Cancel ${label}? Its slots will become available again.`;
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="border border-red-700 px-3 py-1.5 text-sm font-bold whitespace-nowrap text-red-700 transition-colors hover:bg-red-700 hover:text-white"
      >
        {paid ? "Cancel & refund" : "Cancel"}
      </button>
    </form>
  );
}

export function ResendInvoiceButton({ id }: { id: number }) {
  return (
    <form action={resendInvoice}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-xs font-bold underline">
        Resend invoice
      </button>
    </form>
  );
}

export function RetryRefundButton({ id, label }: { id: number; label: string }) {
  return (
    <form
      action={retryRefund}
      onSubmit={(event) => {
        if (!window.confirm(`Try the refund for ${label} again? Razorpay is checked first, so the customer is never refunded twice.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="border border-navy px-3 py-1.5 text-sm font-bold whitespace-nowrap transition-colors hover:bg-navy hover:text-white"
      >
        Retry refund
      </button>
    </form>
  );
}
