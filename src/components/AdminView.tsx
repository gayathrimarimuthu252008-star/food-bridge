import React, { useState } from 'react';
import { AdminOverviewResponse } from '../lib/api.ts';
import { RaceDemoResultDTO } from '../shared/types.ts';
import {
  formatExpiryCountdown,
  getFoodTypeChipClass,
  getStatusTextClass,
} from './formatters.ts';

interface AdminViewProps {
  overview: AdminOverviewResponse | null;
  raceDemoResult: RaceDemoResultDTO | null;
  onRunExpiryScan: () => Promise<void>;
  onRunRaceDemo: () => Promise<void>;
}

export const AdminView: React.FC<AdminViewProps> = ({
  overview,
  raceDemoResult,
  onRunExpiryScan,
  onRunRaceDemo,
}) => {
  const [scanning, setScanning] = useState(false);
  const [racing, setRacing] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    try {
      await onRunExpiryScan();
    } finally {
      setScanning(false);
    }
  };

  const handleRace = async () => {
    setRacing(true);
    try {
      await onRunRaceDemo();
    } finally {
      setRacing(false);
    }
  };

  if (!overview) {
    return (
      <div className="rounded-xl border border-[#E5D7BE] bg-[#FFFDF5] p-8 text-center text-sm text-[#6E5843]">
        Loading system overview...
      </div>
    );
  }

  return (
    <section aria-label="Admin Overview and Concurrency Monitor" className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#E5D7BE] bg-gradient-to-r from-[#FFFDF5] to-[#FDEEE2]/70 p-5 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#3E2C1C]">
            Admin Overview &amp; Concurrency Monitor
          </h2>
          <p className="mt-1 text-sm text-[#6E5843]">
            Inspect active donations, nearest-zone volunteer fleet allocation, polymorphic user summaries, and background worker logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleScan}
            disabled={scanning}
            className="rounded-lg border border-[#DECFAF] bg-white px-4 py-2 text-sm font-medium text-[#3E2C1C] hover:bg-[#F5EBD6] disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {scanning ? 'Scanning...' : 'Run Expiry Scan'}
          </button>
          <button
            type="button"
            onClick={handleRace}
            disabled={racing}
            className="rounded-lg bg-[#2F6F73] px-4 py-2 text-sm font-medium text-white hover:bg-[#25585C] disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {racing ? 'Running 10 Workers...' : 'Run 10-Worker Race Demo'}
          </button>
        </div>
      </div>

      {raceDemoResult && (
        <div className="rounded-xl border border-[#C8DBC6] border-t-[3px] border-t-[#5E8C5A] bg-[#F6FAF5] p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-semibold text-[#3E2C1C]">
              10-Worker Concurrency Race Test Result
            </h3>
            <span className="font-mono-tabular text-xs font-medium text-[#42693F]">
              Winner: {raceDemoResult.winnerThread} · Blocked: {raceDemoResult.failureCount}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#5A4532]">{raceDemoResult.summary}</p>
          <div className="mt-3 max-h-56 overflow-y-auto rounded-lg bg-[#3E2C1C] p-4 font-mono-tabular text-xs leading-relaxed text-[#FAF3E0]">
            {raceDemoResult.logs.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#E5D7BE] border-t-[3px] border-t-[#2F6F73] bg-[#FFFDF5] p-6">
          <h3 className="text-base font-semibold text-[#3E2C1C]">
            Volunteer Fleet Status
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#EFE5D0] text-xs font-medium text-[#78614B]">
                  <th className="py-2 pr-3">Volunteer</th>
                  <th className="py-2 pr-3">Zone</th>
                  <th className="py-2 pr-3 text-right">Deliveries</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4ECDC]">
                {overview.volunteers.map((v) => (
                  <tr key={v.id} className="hover:bg-[#FAF3E0]/55">
                    <td className="py-2.5 pr-3">
                      <div className="font-medium text-[#3E2C1C]">{v.name}</div>
                      <div className="text-xs text-[#78614B]">{v.vehicleType}</div>
                    </td>
                    <td className="py-2.5 pr-3 text-[#5A4532]">{v.cityZone}</td>
                    <td className="py-2.5 pr-3 text-right font-mono-tabular text-[#3E2C1C]">
                      {v.completedDeliveries ?? 0}
                    </td>
                    <td
                      className={`py-2.5 text-right text-xs font-semibold ${
                        v.available ? 'text-[#476F43]' : 'text-[#9B6D16]'
                      }`}
                    >
                      {v.available ? 'FREE' : `BUSY (${v.assignedRequestId ?? ''})`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-[#E5D7BE] border-t-[3px] border-t-[#4F5D95] bg-[#FFFDF5] p-6">
          <h3 className="text-base font-semibold text-[#3E2C1C]">
            Background Worker Activity Log
          </h3>
          <div className="mt-3 max-h-72 overflow-y-auto rounded-lg bg-[#3E2C1C] p-4 font-mono-tabular text-xs leading-relaxed text-[#FAF3E0]">
            {overview.threadLogs.length === 0 ? (
              <div>No background events recorded yet.</div>
            ) : (
              overview.threadLogs.map((l, idx) => <div key={idx}>{l}</div>)
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#E5D7BE] border-t-[3px] border-t-[#C8694A] bg-[#FFFDF5] p-6">
        <h3 className="text-base font-semibold text-[#3E2C1C]">
          All Food Donations ({overview.donations.length})
        </h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#EFE5D0] text-xs font-medium text-[#78614B]">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Item &amp; Donor</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3 text-right">Quantity</th>
                <th className="py-2 pr-3">Window</th>
                <th className="py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4ECDC]">
              {overview.donations.map((f) => (
                <tr key={f.id} className="hover:bg-[#FAF3E0]/55">
                  <td className="py-2.5 pr-3 font-mono-tabular text-xs text-[#78614B]">
                    {f.id}
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="font-medium text-[#3E2C1C]">{f.name}</div>
                    <div className="text-xs text-[#78614B]">
                      {f.donorName} · {f.cityZone}
                    </div>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${getFoodTypeChipClass(
                        f.foodType,
                      )}`}
                    >
                      {f.foodTypeLabel} ({f.safeHours}h)
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono-tabular text-[#3E2C1C]">
                    {f.availableQuantity}/{f.initialQuantity} {f.unit}
                  </td>
                  <td className="py-2.5 pr-3 font-mono-tabular text-xs text-[#4F5D95]">
                    {formatExpiryCountdown(f.expiryTime, f.minutesRemaining)}
                  </td>
                  <td className={`py-2.5 text-right text-xs ${getStatusTextClass(f.status)}`}>
                    {f.statusLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-[#E5D7BE] border-t-[3px] border-t-[#D9A441] bg-[#FFFDF5] p-6">
        <h3 className="text-base font-semibold text-[#3E2C1C]">All Delivery Requests</h3>
        {overview.requests.length === 0 ? (
          <p className="mt-3 text-sm text-[#6E5843]">No NGO requests submitted yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#EFE5D0] text-xs font-medium text-[#78614B]">
                  <th className="py-2 pr-3">Request ID</th>
                  <th className="py-2 pr-3">Food</th>
                  <th className="py-2 pr-3 text-right">Qty</th>
                  <th className="py-2 pr-3">NGO</th>
                  <th className="py-2 pr-3">Volunteer</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4ECDC]">
                {overview.requests.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FAF3E0]/55">
                    <td className="py-2.5 pr-3 font-mono-tabular text-xs text-[#78614B]">
                      {r.id}
                    </td>
                    <td className="py-2.5 pr-3 font-medium text-[#3E2C1C]">{r.foodName}</td>
                    <td className="py-2.5 pr-3 text-right font-mono-tabular text-[#3E2C1C]">
                      {r.requestedQuantity} {r.unit}
                    </td>
                    <td className="py-2.5 pr-3 text-[#5A4532]">{r.ngoName}</td>
                    <td className="py-2.5 pr-3 text-[#5A4532]">
                      {r.volunteerName || 'Pending Allocation'}
                    </td>
                    <td className={`py-2.5 text-right text-xs ${getStatusTextClass(r.status)}`}>
                      {r.statusLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#E5D7BE] border-t-[3px] border-t-[#5E8C5A] bg-[#FFFDF5] p-6">
        <h3 className="text-base font-semibold text-[#3E2C1C]">
          Registered Users (Polymorphic Summaries)
        </h3>
        <div className="mt-3 divide-y divide-[#F4ECDC]">
          {overview.users.map((u) => (
            <div
              key={u.id}
              className="flex flex-col justify-between gap-1 py-2.5 sm:flex-row sm:items-center"
            >
              <div>
                <span className="font-mono-tabular text-xs text-[#8A715A] mr-2">
                  {u.id}
                </span>
                <span className="text-sm font-medium text-[#3E2C1C]">{u.name}</span>
                <span className="ml-2 text-xs font-medium text-[#2F6F73]">({u.roleLabel})</span>
              </div>
              <p className="text-xs text-[#6E5843]">{u.dashboardInfo}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
