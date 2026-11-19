import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { FoodItemDTO } from '../shared/types.ts';

interface RequestModalProps {
  food: FoodItemDTO | null;
  onClose: () => void;
  onConfirm: (foodId: string, quantity: number) => Promise<void>;
}

export const RequestModal: React.FC<RequestModalProps> = ({
  food,
  onClose,
  onConfirm,
}) => {
  const [quantity, setQuantity] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (food) {
      setQuantity(String(food.availableQuantity));
    }
  }, [food]);

  if (!food) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(quantity);
    if (!Number.isFinite(num) || num <= 0) return;
    setSubmitting(true);
    try {
      await onConfirm(food.id, num);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-[#E5D7BE] bg-[#FFFDF5] p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4 border-b border-[#EFE5D0] pb-4">
          <div>
            <h3 id="request-modal-title" className="text-lg font-semibold text-[#3E2C1C]">
              Request Food Donation
            </h3>
            <p className="mt-1 text-sm text-[#6E5843]">
              {food.name} · Available:{' '}
              <span className="font-mono-tabular font-medium text-[#2F6F73]">
                {food.availableQuantity} {food.unit}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#8A715A] hover:bg-[#F5EBD6] hover:text-[#3E2C1C]"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="modal-req-qty"
              className="block text-sm font-medium text-[#3E2C1C]"
            >
              Quantity to Request ({food.unit})
            </label>
            <input
              id="modal-req-qty"
              type="number"
              required
              min="0.1"
              max={food.availableQuantity}
              step="0.1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] tabular-nums focus:border-[#2F6F73] focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/15"
            />
            <p className="mt-1.5 text-xs text-[#6E5843]">
              Partial quantities are supported. The nearest available volunteer will be
              assigned automatically.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#DECFAF] bg-white px-4 py-2 text-sm font-medium text-[#3E2C1C] hover:bg-[#F5EBD6] whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[#2F6F73] px-4 py-2 text-sm font-medium text-white hover:bg-[#25585C] disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {submitting ? 'Submitting...' : 'Confirm Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
