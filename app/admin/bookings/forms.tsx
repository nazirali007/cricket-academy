"use client";

import { cancelBooking, resendInvoice } from "./actions";

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
          ? `Cancel ${label}? The academy is cancelling, so the customer gets a FULL refund through Razorpay now, and the slots become available again.`
          : `Cancel ${label}? Its slots will become available again.`;
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="border border-red-700 px-3 py-1.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-700 hover:text-white"
      >
        Cancel
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
