"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { CANCELLATION_REASONS } from "@/types/order";

/**
 * Modal for cancelling an order with a required reason. Mount it conditionally
 * (e.g. `{open && <CancelOrderDialog .../>}`) so its state resets on each open.
 * The chosen reason is passed to {@link onConfirm} and emailed to the customer.
 */
export default function CancelOrderDialog({
  busy,
  orderLabel,
  onConfirm,
  onClose,
}: {
  busy: boolean;
  orderLabel?: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [preset, setPreset] = useState<string>(CANCELLATION_REASONS[0]);
  const [custom, setCustom] = useState("");

  const reason = preset === "Autre" ? custom.trim() : preset;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-800">
          Annuler la commande{orderLabel ? ` ${orderLabel}` : ""}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Sélectionnez un motif. Le client en sera informé par e-mail.
        </p>

        <div className="mt-4 space-y-2">
          {CANCELLATION_REASONS.map((r) => (
            <label
              key={r}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
            >
              <input
                type="radio"
                name="cancelReason"
                value={r}
                checked={preset === r}
                onChange={() => setPreset(r)}
              />
              {r}
            </label>
          ))}
          {preset === "Autre" && (
            <input
              autoFocus
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Précisez le motif…"
              maxLength={500}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Retour
          </button>
          <button
            onClick={() => reason && onConfirm(reason)}
            disabled={busy || !reason}
            className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            Confirmer l&apos;annulation
          </button>
        </div>
      </div>
    </div>
  );
}
