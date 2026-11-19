export enum UserRole {
  DONOR = 'DONOR',
  NGO = 'NGO',
  VOLUNTEER = 'VOLUNTEER',
  ADMIN = 'ADMIN',
}

export enum FoodType {
  COOKED = 'COOKED',
  PACKAGED = 'PACKAGED',
  RAW_INGREDIENTS = 'RAW_INGREDIENTS',
}

export enum DonationStatus {
  AVAILABLE = 'AVAILABLE',
  REQUESTED = 'REQUESTED',
  ALLOCATED = 'ALLOCATED',
  PICKED_UP = 'PICKED_UP',
  DELIVERED = 'DELIVERED',
  EXPIRED = 'EXPIRED',
}

export type UrgencyLevel = 'CRITICAL' | 'WARNING' | 'NORMAL' | 'EXPIRED';

export interface UserSummaryDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  cityZone: string;
  role: UserRole;
  roleLabel: string;
  dashboardInfo: string;
  donorCategory?: string;
  licenseNumber?: string;
  totalDonationsCount?: number;
  priorityScore?: number;
  registrationNumber?: string;
  beneficiaryCapacity?: number;
  vehicleType?: string;
  available?: boolean;
  assignedRequestId?: string | null;
  completedDeliveries?: number;
  allocationSummary?: string;
}

export interface FoodItemDTO {
  id: string;
  donorId: string;
  donorName: string;
  name: string;
  foodType: FoodType;
  foodTypeLabel: string;
  initialQuantity: number;
  availableQuantity: number;
  unit: string;
  expiryTime: string;
  createdAt: string;
  pickupAddress: string;
  cityZone: string;
  notes: string;
  status: DonationStatus;
  statusLabel: string;
  statusColor: string;
  safeHours: number;
  storageInstruction: string;
  minutesRemaining: number;
  urgencyLevel: UrgencyLevel;
  vegetarian?: boolean;
  servingTemp?: string;
  sealIntact?: boolean;
  batchCode?: string;
  requiresRefrigeration?: boolean;
}

export interface DonationRequestDTO {
  id: string;
  foodId: string;
  foodName: string;
  donorId: string;
  donorName: string;
  ngoId: string;
  ngoName: string;
  requestedQuantity: number;
  unit: string;
  pickupAddress: string;
  pickupZone: string;
  dropAddress: string;
  volunteerId: string | null;
  volunteerName: string | null;
  status: DonationStatus;
  statusLabel: string;
  statusColor: string;
  requestedAt: string;
  allocatedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
}

export interface NotificationDTO {
  id: string;
  userId: string;
  category: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface DashboardStatsDTO {
  totalDonated: number;
  availableCount: number;
  totalDelivered: number;
  totalExpired: number;
  activeRequests: number;
  freeVolunteers: number;
  totalVolunteers: number;
  myDonations?: number;
  myDelivered?: number;
  myExpired?: number;
  myRequests?: number;
  myActive?: number;
  myTasks?: number;
  isVolunteerFree?: boolean;
}

export interface RaceDemoResultDTO {
  summary: string;
  winnerThread: string;
  successCount: number;
  failureCount: number;
  logs: string[];
}
