"use client";

import { useActionState } from "react";
import { admissionStatuses, type AdmissionStatus } from "@/lib/admission-status";
import { removeAdmission, saveAdmission } from "./actions";

// Status and private notes for one admission request.
export function AdmissionEditor({
  id,
  status,
  notes,
}: {
  id: number;
  status: AdmissionStatus;
  notes: string | null;
}) {
  const [message, action, pending] = useActionState(saveAdmission, null);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <label className="block text-xs font-bold">
        Status
        <select
          name="status"
          defaultValue={status}
          className="mt-1 h-10 w-full border border-navy/25 bg-white px-2 text-sm"
        >
          {Object.entries(admissionStatuses).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-bold">
        Notes (only admins see these)
        <textarea
          name="notes"
          rows={2}
          maxLength={2000}
          defaultValue={notes ?? ""}
          placeholder="e.g. Called 12 Nov, joining the evening batch"
          className="mt-1 w-full border border-navy/25 bg-white p-2 text-sm font-normal"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-navy px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <span role="status" className="text-xs font-semibold text-emerald-700">
          {!pending && message}
        </span>
      </div>
    </form>
  );
}

export function DeleteAdmissionButton({ id, name }: { id: number; name: string }) {
  return (
    <form
      action={removeAdmission}
      onSubmit={(event) => {
        if (!window.confirm(`Delete the request from ${name}? This can't be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-xs font-bold text-red-700 underline">
        Delete
      </button>
    </form>
  );
}
