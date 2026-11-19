import { DonationStatus, FoodType, UrgencyLevel } from '../shared/types.ts';

export function formatExpiryCountdown(isoStr: string, minsRemaining: number): string {
  const dt = new Date(isoStr);
  const timeStr = Number.isNaN(dt.getTime())
    ? isoStr
    : dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (minsRemaining <= 0) return `Expired (${timeStr})`;
  if (minsRemaining < 60) return `${minsRemaining}m left · ${timeStr}`;
  const hrs = Math.floor(minsRemaining / 60);
  const mins = minsRemaining % 60;
  return `${hrs}h ${mins}m left · ${timeStr}`;
}

export function getUrgencyMeta(level: UrgencyLevel): {
  label: string;
  textClass: string;
  topBorderClass: string;
  headerBgClass: string;
} {
  switch (level) {
    case 'CRITICAL':
      return {
        label: 'Critical · <= 1h left',
        textClass: 'text-[#A84A2F] font-semibold',
        topBorderClass: 'border-t-[3px] border-t-[#C8694A]',
        headerBgClass: 'bg-[#FCEEE9]',
      };
    case 'WARNING':
      return {
        label: 'Soon · <= 3h left',
        textClass: 'text-[#9B6D16] font-semibold',
        topBorderClass: 'border-t-[3px] border-t-[#D9A441]',
        headerBgClass: 'bg-[#FCF5E1]',
      };
    case 'EXPIRED':
      return {
        label: 'Expired',
        textClass: 'text-[#A84A2F] font-semibold',
        topBorderClass: 'border-t-[3px] border-t-[#C8694A]',
        headerBgClass: 'bg-[#FCEEE9]',
      };
    default:
      return {
        label: 'Safe Window',
        textClass: 'text-[#42693F] font-semibold',
        topBorderClass: 'border-t-[3px] border-t-[#5E8C5A]',
        headerBgClass: 'bg-[#EFF5EE]',
      };
  }
}

export function getFoodTypeChipClass(foodType: FoodType): string {
  switch (foodType) {
    case FoodType.COOKED:
      return 'border border-[#E7C6B9] bg-[#FBF0EB] text-[#9A472C]';
    case FoodType.PACKAGED:
      return 'border border-[#C9CFE6] bg-[#EFF1F8] text-[#3B487B]';
    case FoodType.RAW_INGREDIENTS:
      return 'border border-[#C8DBC6] bg-[#EFF5EE] text-[#3F683B]';
  }
}

export function getStatusTextClass(status: DonationStatus): string {
  switch (status) {
    case DonationStatus.AVAILABLE:
    case DonationStatus.DELIVERED:
      return 'text-[#476F43] font-semibold';
    case DonationStatus.REQUESTED:
      return 'text-[#9B6D16] font-semibold';
    case DonationStatus.ALLOCATED:
      return 'text-[#4F5D95] font-semibold';
    case DonationStatus.PICKED_UP:
      return 'text-[#2F6F73] font-semibold';
    case DonationStatus.EXPIRED:
      return 'text-[#A84A2F] font-semibold';
  }
}
