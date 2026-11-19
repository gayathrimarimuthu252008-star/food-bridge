import React from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { DonationStatus, FoodItemDTO, UserRole, UserSummaryDTO } from '../shared/types.ts';
import {
  formatExpiryCountdown,
  getFoodTypeChipClass,
  getUrgencyMeta,
} from './formatters.ts';

interface MarketplaceViewProps {
  donations: FoodItemDTO[];
  loading: boolean;
  searchQuery: string;
  typeFilter: string;
  currentUser: UserSummaryDTO | null;
  onSearchChange: (q: string) => void;
  onTypeFilterChange: (t: string) => void;
  onRefresh: () => void;
  onOpenRequest: (food: FoodItemDTO) => void;
  onNavigateAuth: () => void;
}

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'COOKED', label: 'Cooked' },
  { value: 'PACKAGED', label: 'Packaged' },
  { value: 'RAW_INGREDIENTS', label: 'Raw Ingredients' },
];

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  donations,
  loading,
  searchQuery,
  typeFilter,
  currentUser,
  onSearchChange,
  onTypeFilterChange,
  onRefresh,
  onOpenRequest,
  onNavigateAuth,
}) => {
  const isNgo = currentUser?.role === UserRole.NGO;

  return (
    <section aria-label="Food Donation Marketplace" className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-[#E5D7BE] bg-gradient-to-r from-[#FFFDF5] to-[#FDEEE2]/70 p-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#3E2C1C]">
            Available Surplus Donations
          </h2>
          <p className="mt-1 text-sm text-[#6E5843]">
            Sorted by earliest expiry ·{' '}
            <span className="font-medium text-[#A84A2F]">Critical &le; 1h</span> ·{' '}
            <span className="font-medium text-[#9B6D16]">Soon &le; 3h</span> ·{' '}
            <span className="font-medium text-[#42693F]">Safe &gt; 3h</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A715A]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search idli, Chennai, donor..."
              aria-label="Search food donations"
              className="w-64 rounded-lg border border-[#DECFAF] bg-white py-2 pl-9 pr-3 text-sm text-[#3E2C1C] placeholder:text-[#9A836D] focus:border-[#2F6F73] focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/15"
            />
          </div>

          <div
            className="flex items-center gap-1 rounded-lg border border-[#E5D7BE] bg-[#F5EBD6] p-1"
            role="group"
            aria-label="Filter by food type"
          >
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onTypeFilterChange(opt.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  typeFilter === opt.value
                    ? 'bg-[#2F6F73] text-white shadow-xs'
                    : 'text-[#5A4532] hover:text-[#3E2C1C]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DECFAF] bg-white px-3.5 py-2 text-xs font-medium text-[#3E2C1C] hover:bg-[#F5EBD6] whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && donations.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-xl border border-[#E5D7BE] bg-[#FFFDF5] p-5"
            />
          ))}
        </div>
      ) : donations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#D9C6A5] bg-[#FFFDF5] px-6 py-14 text-center">
          <p className="text-base font-medium text-[#3E2C1C]">
            No available donations match your current filters
          </p>
          <p className="mt-1 text-sm text-[#6E5843]">
            Clear your search or check back shortly as donors publish new surplus food.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {donations.map((f) => {
            const urgency = getUrgencyMeta(f.urgencyLevel);
            const chipClass = getFoodTypeChipClass(f.foodType);
            const canRequest =
              isNgo &&
              f.availableQuantity > 0 &&
              f.status === DonationStatus.AVAILABLE;

            return (
              <article
                key={f.id}
                className={`flex flex-col justify-between overflow-hidden rounded-xl border border-[#E5D7BE] bg-[#FFFDF5] ${urgency.topBorderClass}`}
              >
                <div>
                  <div
                    className={`flex items-center justify-between gap-2 border-b border-[#EFE5D0] px-5 py-2.5 text-xs ${urgency.headerBgClass}`}
                  >
                    <span className={urgency.textClass}>{urgency.label}</span>
                    <span className="font-mono-tabular text-[#6E5843]">
                      {f.id} · {f.statusLabel}
                    </span>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-semibold leading-snug text-[#3E2C1C]">
                        {f.name}
                      </h3>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap shrink-0 ${chipClass}`}
                      >
                        {f.foodTypeLabel}
                      </span>
                    </div>

                    <p className="mt-1 text-xs font-medium text-[#2F6F73]">
                      Safe {f.safeHours}h rule · {f.cityZone}
                    </p>

                    <dl className="mt-4 space-y-2 border-t border-[#EFE5D0] pt-3.5 text-sm">
                      <div className="flex items-baseline justify-between gap-2">
                        <dt className="text-[#78614B]">Available</dt>
                        <dd className="font-mono-tabular font-semibold text-[#3E2C1C]">
                          {f.availableQuantity} / {f.initialQuantity} {f.unit}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <dt className="text-[#78614B]">Donor</dt>
                        <dd className="text-right font-medium text-[#3E2C1C]">
                          {f.donorName}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <dt className="text-[#78614B]">Pickup</dt>
                        <dd className="text-right text-[#5A4532]">{f.pickupAddress}</dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <dt className="text-[#78614B]">Window</dt>
                        <dd className="font-mono-tabular text-right text-[#4F5D95]">
                          {formatExpiryCountdown(f.expiryTime, f.minutesRemaining)}
                        </dd>
                      </div>
                    </dl>

                    <p className="mt-3 text-xs leading-relaxed text-[#6E5843]">
                      {f.storageInstruction}
                      {f.notes ? ` Note: ${f.notes}` : ''}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5">
                  {canRequest ? (
                    <button
                      type="button"
                      onClick={() => onOpenRequest(f)}
                      className="w-full rounded-lg bg-[#2F6F73] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#25585C] whitespace-nowrap"
                    >
                      Request Food
                    </button>
                  ) : !currentUser ? (
                    <button
                      type="button"
                      onClick={onNavigateAuth}
                      className="w-full rounded-lg border border-[#C5D8D9] bg-[#EEF5F5] px-4 py-2 text-xs font-medium text-[#2F6F73] hover:bg-[#E1EFEF] whitespace-nowrap"
                    >
                      Sign in as NGO to Request
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
