import {
  DonationStatus,
  DonationRequestDTO,
  FoodItemDTO,
  FoodType,
  NotificationDTO,
  UrgencyLevel,
  UserRole,
  UserSummaryDTO,
} from '../../src/shared/types.ts';
import {
  APP_CONSTANTS,
  FOOD_TYPE_LABELS,
  ROLE_LABELS,
  STATUS_META,
  getCoordinatesForZone,
  normalizeZone,
} from './constants.ts';

export class DomainException extends Error {
  public readonly statusCode: number;
  public readonly errorType: string;

  constructor(message: string, statusCode: number, errorType: string) {
    super(message);
    this.statusCode = statusCode;
    this.errorType = errorType;
  }
}

export class InvalidInputException extends DomainException {
  constructor(message: string) {
    super(message, 400, 'InvalidInputException');
  }
}

export class UnauthorizedException extends DomainException {
  constructor(message: string) {
    super(message, 401, 'Unauthorized');
  }
}

export class DuplicateUserException extends DomainException {
  constructor(message: string) {
    super(message, 409, 'DuplicateUserException');
  }
}

export class FoodExpiredException extends DomainException {
  constructor(message: string) {
    super(message, 409, 'FoodExpiredException');
  }
}

export class InsufficientQuantityException extends DomainException {
  constructor(message: string) {
    super(message, 409, 'InsufficientQuantityException');
  }
}

export class NoVolunteerAvailableException extends DomainException {
  constructor(message: string) {
    super(message, 503, 'NoVolunteerAvailableException');
  }
}

export class IdGenerator {
  private static userSeq = 1;
  private static foodSeq = 1;
  private static reqSeq = 1;
  private static notifSeq = 1;

  static nextUserId(role: UserRole): string {
    const prefix =
      role === UserRole.DONOR
        ? 'D'
        : role === UserRole.NGO
          ? 'N'
          : role === UserRole.VOLUNTEER
            ? 'V'
            : 'A';
    return `${prefix}${String(this.userSeq++).padStart(3, '0')}`;
  }

  static nextFoodId(): string {
    return `F${String(this.foodSeq++).padStart(3, '0')}`;
  }

  static nextRequestId(): string {
    return `R${String(this.reqSeq++).padStart(3, '0')}`;
  }

  static nextNotificationId(): string {
    return `MSG${String(this.notifSeq++).padStart(4, '0')}`;
  }

  static reset(): void {
    this.userSeq = 1;
    this.foodSeq = 1;
    this.reqSeq = 1;
    this.notifSeq = 1;
  }
}

export const ValidationUtil = {
  requireNonBlank(value: string | undefined | null, fieldName: string): string {
    const trimmed = (value ?? '').trim();
    if (!trimmed) {
      throw new InvalidInputException(`${fieldName} is required and cannot be blank.`);
    }
    return trimmed;
  },

  validateEmail(email: string | undefined | null): string {
    const cleaned = this.requireNonBlank(email, 'Email').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      throw new InvalidInputException(`Invalid email format: ${cleaned}`);
    }
    return cleaned;
  },

  validatePhone(phone: string | undefined | null): string {
    const cleaned = this.requireNonBlank(phone, 'Phone').replace(/[\s-]/g, '');
    if (!/^\d{10}$/.test(cleaned)) {
      throw new InvalidInputException('Phone number must contain exactly 10 digits.');
    }
    return cleaned;
  },

  validatePositiveDouble(val: number, fieldName: string): number {
    if (!Number.isFinite(val) || val <= 0) {
      throw new InvalidInputException(`${fieldName} must be greater than 0.`);
    }
    return Math.round(val * 100) / 100;
  },

  validateFutureTime(date: Date, fieldName: string): Date {
    if (Number.isNaN(date.getTime())) {
      throw new InvalidInputException(`${fieldName} is invalid.`);
    }
    if (date.getTime() <= Date.now()) {
      throw new InvalidInputException(`${fieldName} must be in the future.`);
    }
    return date;
  },
};

export class NotificationMessage {
  public readonly id: string;
  public readonly userId: string;
  public readonly category: string;
  public readonly message: string;
  public readonly timestamp: Date;
  public read = false;

  constructor(userId: string, category: string, message: string) {
    this.id = IdGenerator.nextNotificationId();
    this.userId = userId;
    this.category = (category || 'INFO').trim().toUpperCase();
    this.message = message || '';
    this.timestamp = new Date();
  }

  toDTO(): NotificationDTO {
    return {
      id: this.id,
      userId: this.userId,
      category: this.category,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      read: this.read,
    };
  }
}

export abstract class User {
  public readonly id: string;
  public name: string;
  public email: string;
  private password: string;
  public phone: string;
  public address: string;
  public cityZone: string;
  public latitude: number;
  public longitude: number;
  private notifications: NotificationMessage[] = [];

  protected constructor(
    role: UserRole,
    name: string,
    email: string,
    password: string,
    phone: string,
    address: string,
    cityZone: string,
  ) {
    this.id = IdGenerator.nextUserId(role);
    this.name = ValidationUtil.requireNonBlank(name, 'Name');
    this.email = ValidationUtil.validateEmail(email);
    const cleanedPass = ValidationUtil.requireNonBlank(password, 'Password');
    if (cleanedPass.length < 4) {
      throw new InvalidInputException('Password must be at least 4 characters.');
    }
    this.password = cleanedPass;
    this.phone = ValidationUtil.validatePhone(phone);
    this.address = ValidationUtil.requireNonBlank(address, 'Address');
    this.cityZone = normalizeZone(cityZone);
    const [lat, lon] = getCoordinatesForZone(this.cityZone);
    this.latitude = lat;
    this.longitude = lon;
  }

  checkPassword(candidate: string): boolean {
    return candidate === this.password;
  }

  getNotifications(): NotificationMessage[] {
    return [...this.notifications];
  }

  notifyUser(msg: NotificationMessage): void {
    this.notifications.unshift(msg);
    if (this.notifications.length > 50) {
      this.notifications.pop();
    }
  }

  abstract getRole(): UserRole;
  abstract getDashboardInfo(): string;

  toSummaryMap(): UserSummaryDTO {
    const role = this.getRole();
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      address: this.address,
      cityZone: this.cityZone,
      role,
      roleLabel: ROLE_LABELS[role],
      dashboardInfo: this.getDashboardInfo(),
    };
  }
}

export abstract class Donor extends User {
  public licenseNumber: string;
  public totalDonationsCount = 0;

  protected constructor(
    name: string,
    email: string,
    password: string,
    phone: string,
    address: string,
    cityZone: string,
    licenseNumber: string,
  ) {
    super(UserRole.DONOR, name, email, password, phone, address, cityZone);
    this.licenseNumber = ValidationUtil.requireNonBlank(licenseNumber, 'License number');
  }

  incrementDonationsCount(): void {
    this.totalDonationsCount++;
  }

  getRole(): UserRole {
    return UserRole.DONOR;
  }

  abstract getDonorCategory(): string;

  getDonationPriorityScore(): number {
    return 7.0;
  }

  override toSummaryMap(): UserSummaryDTO {
    return {
      ...super.toSummaryMap(),
      donorCategory: this.getDonorCategory(),
      licenseNumber: this.licenseNumber,
      totalDonationsCount: this.totalDonationsCount,
      priorityScore: this.getDonationPriorityScore(),
    };
  }
}

export class Restaurant extends Donor {
  public cuisineType: string;

  constructor(
    name: string,
    email: string,
    password: string,
    phone: string,
    address: string,
    cityZone: string,
    licenseNumber: string,
    cuisineType: string,
  ) {
    super(name, email, password, phone, address, cityZone, licenseNumber);
    this.cuisineType = ValidationUtil.requireNonBlank(cuisineType, 'Cuisine type');
  }

  getDonorCategory(): string {
    return 'Restaurant';
  }

  override getDonationPriorityScore(): number {
    return 8.5;
  }

  getDashboardInfo(): string {
    return `Restaurant (${this.cuisineType}) · Zone: ${this.cityZone} · Priority ${this.getDonationPriorityScore().toFixed(1)} · Donations: ${this.totalDonationsCount}`;
  }
}

export class Hotel extends Donor {
  public starRating: number;

  constructor(
    name: string,
    email: string,
    password: string,
    phone: string,
    address: string,
    cityZone: string,
    licenseNumber: string,
    starRating: number,
  ) {
    super(name, email, password, phone, address, cityZone, licenseNumber);
    if (starRating < 1 || starRating > 5) {
      throw new InvalidInputException('Hotel star rating must be between 1 and 5.');
    }
    this.starRating = starRating;
  }

  getDonorCategory(): string {
    return 'Hotel';
  }

  override getDonationPriorityScore(): number {
    return 9.0 + this.starRating * 0.2;
  }

  getDashboardInfo(): string {
    return `${this.starRating}-Star Hotel · Zone: ${this.cityZone} · Priority ${this.getDonationPriorityScore().toFixed(1)} · Donations: ${this.totalDonationsCount}`;
  }
}

export class EventOrganizer extends Donor {
  public eventScale: string;

  constructor(
    name: string,
    email: string,
    password: string,
    phone: string,
    address: string,
    cityZone: string,
    licenseNumber: string,
    eventScale: string,
  ) {
    super(name, email, password, phone, address, cityZone, licenseNumber);
    this.eventScale = ValidationUtil.requireNonBlank(eventScale, 'Event scale');
  }

  getDonorCategory(): string {
    return 'Event Organizer';
  }

  override getDonationPriorityScore(): number {
    return 9.5;
  }

  getDashboardInfo(): string {
    return `Event Organizer (${this.eventScale} scale) · Zone: ${this.cityZone} · Priority ${this.getDonationPriorityScore().toFixed(1)} · Donations: ${this.totalDonationsCount}`;
  }
}

export class NGO extends User {
  public registrationNumber: string;
  public beneficiaryCapacity: number;

  constructor(
    name: string,
    email: string,
    password: string,
    phone: string,
    address: string,
    cityZone: string,
    registrationNumber: string,
    beneficiaryCapacity: number,
  ) {
    super(UserRole.NGO, name, email, password, phone, address, cityZone);
    this.registrationNumber = ValidationUtil.requireNonBlank(
      registrationNumber,
      'NGO registration number',
    );
    if (beneficiaryCapacity <= 0) {
      throw new InvalidInputException('Beneficiary capacity must be greater than 0.');
    }
    this.beneficiaryCapacity = beneficiaryCapacity;
  }

  getRole(): UserRole {
    return UserRole.NGO;
  }

  getDashboardInfo(): string {
    return `NGO (Reg: ${this.registrationNumber}) · Zone: ${this.cityZone} · Daily Capacity: ${this.beneficiaryCapacity} people`;
  }

  override toSummaryMap(): UserSummaryDTO {
    return {
      ...super.toSummaryMap(),
      registrationNumber: this.registrationNumber,
      beneficiaryCapacity: this.beneficiaryCapacity,
    };
  }
}

export class Volunteer extends User {
  public vehicleType: string;
  public available = true;
  public assignedRequestId: string | null = null;
  public completedDeliveries = 0;

  constructor(
    name: string,
    email: string,
    password: string,
    phone: string,
    address: string,
    cityZone: string,
    vehicleType: string,
  ) {
    super(UserRole.VOLUNTEER, name, email, password, phone, address, cityZone);
    this.vehicleType = ValidationUtil.requireNonBlank(vehicleType, 'Vehicle type');
  }

  allocate(requestId: string): void {
    if (!this.available) {
      throw new NoVolunteerAvailableException(`Volunteer ${this.name} is already busy.`);
    }
    this.available = false;
    this.assignedRequestId = requestId;
  }

  release(): void {
    this.available = true;
    this.assignedRequestId = null;
  }

  getAllocationSummary(): string {
    return this.available
      ? 'Available for pickup'
      : `Assigned to ${this.assignedRequestId ?? 'task'}`;
  }

  getRole(): UserRole {
    return UserRole.VOLUNTEER;
  }

  getDashboardInfo(): string {
    return `Volunteer (${this.vehicleType}) · Zone: ${this.cityZone} · ${this.getAllocationSummary()} · Deliveries: ${this.completedDeliveries}`;
  }

  override toSummaryMap(): UserSummaryDTO {
    return {
      ...super.toSummaryMap(),
      vehicleType: this.vehicleType,
      available: this.available,
      assignedRequestId: this.assignedRequestId,
      completedDeliveries: this.completedDeliveries,
      allocationSummary: this.getAllocationSummary(),
    };
  }
}

export abstract class FoodItem {
  public readonly id: string;
  public readonly donorId: string;
  public readonly donorName: string;
  public name: string;
  public initialQuantity: number;
  public availableQuantity: number;
  public unit: string;
  public expiryTime: Date;
  public readonly createdAt: Date;
  public pickupAddress: string;
  public cityZone: string;
  public latitude: number;
  public longitude: number;
  public notes: string;
  public status: DonationStatus;

  protected constructor(
    donorId: string,
    donorName: string,
    name: string,
    quantity: number,
    unit: string,
    expiryTime: Date,
    pickupAddress: string,
    cityZone: string,
    notes = '',
  ) {
    this.id = IdGenerator.nextFoodId();
    this.donorId = ValidationUtil.requireNonBlank(donorId, 'Donor ID');
    this.donorName = ValidationUtil.requireNonBlank(donorName, 'Donor name');
    this.name = ValidationUtil.requireNonBlank(name, 'Food name');
    const validQty = ValidationUtil.validatePositiveDouble(quantity, 'Quantity');
    this.initialQuantity = validQty;
    this.availableQuantity = validQty;
    this.unit = ValidationUtil.requireNonBlank(unit, 'Unit');
    this.expiryTime = ValidationUtil.validateFutureTime(expiryTime, 'Expiry time');
    this.createdAt = new Date();
    this.pickupAddress = ValidationUtil.requireNonBlank(pickupAddress, 'Pickup address');
    this.cityZone = normalizeZone(cityZone);
    const [lat, lon] = getCoordinatesForZone(this.cityZone);
    this.latitude = lat;
    this.longitude = lon;
    this.notes = notes.trim();
    this.status = DonationStatus.AVAILABLE;
  }

  reduceInitialQuantityByRemaining(): void {
    this.initialQuantity =
      Math.round((this.initialQuantity - this.availableQuantity) * 100) / 100;
    this.availableQuantity = 0;
  }

  isExpired(): boolean {
    return (
      this.status === DonationStatus.EXPIRED ||
      Date.now() > this.expiryTime.getTime()
    );
  }

  markExpired(): void {
    this.status = DonationStatus.EXPIRED;
  }

  minutesUntilExpiry(): number {
    return Math.ceil((this.expiryTime.getTime() - Date.now()) / 60_000);
  }

  getUrgencyLevel(): UrgencyLevel {
    if (this.isExpired()) return 'EXPIRED';
    const mins = this.minutesUntilExpiry();
    if (mins <= APP_CONSTANTS.CRITICAL_EXPIRY_MINUTES) return 'CRITICAL';
    if (mins <= APP_CONSTANTS.WARNING_EXPIRY_MINUTES) return 'WARNING';
    return 'NORMAL';
  }

  deductQuantity(requestedQty: number): void {
    if (this.isExpired()) {
      this.markExpired();
      throw new FoodExpiredException(`Food item '${this.name}' has already expired.`);
    }
    const validReq = ValidationUtil.validatePositiveDouble(
      requestedQty,
      'Requested quantity',
    );
    if (validReq > this.availableQuantity) {
      throw new InsufficientQuantityException(
        `Requested ${validReq.toFixed(2)} ${this.unit}, but only ${this.availableQuantity.toFixed(2)} ${this.unit} available for '${this.name}'.`,
      );
    }
    this.availableQuantity =
      Math.round((this.availableQuantity - validReq) * 100) / 100;
    if (this.availableQuantity === 0) {
      this.status = DonationStatus.REQUESTED;
    }
  }

  abstract getFoodType(): FoodType;
  abstract getSafeHours(): number;
  abstract getStorageInstruction(): string;

  toMap(): FoodItemDTO {
    const type = this.getFoodType();
    const meta = STATUS_META[this.status];
    return {
      id: this.id,
      donorId: this.donorId,
      donorName: this.donorName,
      name: this.name,
      foodType: type,
      foodTypeLabel: FOOD_TYPE_LABELS[type],
      initialQuantity: this.initialQuantity,
      availableQuantity: this.availableQuantity,
      unit: this.unit,
      expiryTime: this.expiryTime.toISOString(),
      createdAt: this.createdAt.toISOString(),
      pickupAddress: this.pickupAddress,
      cityZone: this.cityZone,
      notes: this.notes,
      status: this.status,
      statusLabel: meta.label,
      statusColor: meta.color,
      safeHours: this.getSafeHours(),
      storageInstruction: this.getStorageInstruction(),
      minutesRemaining: this.minutesUntilExpiry(),
      urgencyLevel: this.getUrgencyLevel(),
    };
  }
}

export class CookedFood extends FoodItem {
  public vegetarian: boolean;
  public servingTemp: string;
  private readonly safeHoursRule: number;

  constructor(
    donorId: string,
    donorName: string,
    name: string,
    quantity: number,
    unit: string,
    expiryTime: Date,
    pickupAddress: string,
    cityZone: string,
    notes: string,
    vegetarian = true,
    servingTemp = 'Warm',
    safeHoursOverride?: number,
  ) {
    super(
      donorId,
      donorName,
      name,
      quantity,
      unit,
      expiryTime,
      pickupAddress,
      cityZone,
      notes,
    );
    this.vegetarian = vegetarian;
    this.servingTemp = servingTemp.trim() || 'Warm';
    this.safeHoursRule = this.resolveSafeHours(name, safeHoursOverride);
  }

  private resolveSafeHours(itemName: string, override?: number): number {
    if (override && override > 0) return Math.round(override);
    const lower = itemName.toLowerCase();
    if (
      lower.includes('curd') ||
      lower.includes('chutney') ||
      lower.includes('payasam') ||
      lower.includes('buttermilk')
    ) {
      return 2;
    }
    if (lower.includes('tamarind') || lower.includes('puliyogare')) {
      return 6;
    }
    return 4;
  }

  getFoodType(): FoodType {
    return FoodType.COOKED;
  }

  getSafeHours(): number {
    return this.safeHoursRule;
  }

  getStorageInstruction(): string {
    return `${this.vegetarian ? 'Veg' : 'Non-Veg'} cooked dish (${this.servingTemp}). Consume within ${this.getSafeHours()} hours.`;
  }

  override toMap(): FoodItemDTO {
    return {
      ...super.toMap(),
      vegetarian: this.vegetarian,
      servingTemp: this.servingTemp,
    };
  }
}

export class PackagedFood extends FoodItem {
  public sealIntact: boolean;
  public batchCode: string;
  private readonly safeHoursRule: number;

  constructor(
    donorId: string,
    donorName: string,
    name: string,
    quantity: number,
    unit: string,
    expiryTime: Date,
    pickupAddress: string,
    cityZone: string,
    notes: string,
    sealIntact = true,
    batchCode = 'BATCH-STD',
    safeHoursOverride?: number,
  ) {
    super(
      donorId,
      donorName,
      name,
      quantity,
      unit,
      expiryTime,
      pickupAddress,
      cityZone,
      notes,
    );
    this.sealIntact = sealIntact;
    this.batchCode = batchCode.trim() || 'BATCH-STD';
    this.safeHoursRule = this.resolveSafeHours(name, safeHoursOverride);
  }

  private resolveSafeHours(itemName: string, override?: number): number {
    if (override && override > 0) return Math.round(override);
    const lower = itemName.toLowerCase();
    if (lower.includes('milk')) return 12;
    if (lower.includes('bread') || lower.includes('bun')) return 24;
    if (lower.includes('mysore pak')) return 72;
    if (lower.includes('murukku') || lower.includes('chips') || lower.includes('biscuit')) {
      return 168;
    }
    if (lower.includes('water')) return 720;
    return 48;
  }

  getFoodType(): FoodType {
    return FoodType.PACKAGED;
  }

  getSafeHours(): number {
    return this.safeHoursRule;
  }

  getStorageInstruction(): string {
    return `Packaged (Batch ${this.batchCode}, Seal: ${this.sealIntact ? 'Intact' : 'Check'}). Safe window up to ${this.getSafeHours()} hours.`;
  }

  override toMap(): FoodItemDTO {
    return {
      ...super.toMap(),
      sealIntact: this.sealIntact,
      batchCode: this.batchCode,
    };
  }
}

export class RawIngredients extends FoodItem {
  public requiresRefrigeration: boolean;
  private readonly safeHoursRule: number;

  constructor(
    donorId: string,
    donorName: string,
    name: string,
    quantity: number,
    unit: string,
    expiryTime: Date,
    pickupAddress: string,
    cityZone: string,
    notes: string,
    requiresRefrigeration = false,
    safeHoursOverride?: number,
  ) {
    super(
      donorId,
      donorName,
      name,
      quantity,
      unit,
      expiryTime,
      pickupAddress,
      cityZone,
      notes,
    );
    this.requiresRefrigeration = requiresRefrigeration;
    this.safeHoursRule = this.resolveSafeHours(name, requiresRefrigeration, safeHoursOverride);
  }

  private resolveSafeHours(
    itemName: string,
    refrigerated: boolean,
    override?: number,
  ): number {
    if (override && override > 0) return Math.round(override);
    const lower = itemName.toLowerCase();
    if (lower.includes('rice')) return 720;
    if (lower.includes('dal') || lower.includes('flour') || lower.includes('wheat')) {
      return 336;
    }
    return refrigerated ? 72 : 48;
  }

  getFoodType(): FoodType {
    return FoodType.RAW_INGREDIENTS;
  }

  getSafeHours(): number {
    return this.safeHoursRule;
  }

  getStorageInstruction(): string {
    return `${this.requiresRefrigeration ? 'Keep refrigerated' : 'Keep in cool, dry storage'}. Safe shelf-life rule: ${this.getSafeHours()} hours.`;
  }

  override toMap(): FoodItemDTO {
    return {
      ...super.toMap(),
      requiresRefrigeration: this.requiresRefrigeration,
    };
  }
}

export class DonationRequest {
  public readonly id: string;
  public readonly foodId: string;
  public readonly foodName: string;
  public readonly donorId: string;
  public readonly donorName: string;
  public readonly ngoId: string;
  public readonly ngoName: string;
  public readonly requestedQuantity: number;
  public readonly unit: string;
  public readonly pickupAddress: string;
  public readonly pickupZone: string;
  public readonly pickupLatitude: number;
  public readonly pickupLongitude: number;
  public readonly dropAddress: string;
  public readonly requestedAt: Date;

  public volunteerId: string | null = null;
  public volunteerName: string | null = null;
  public status: DonationStatus = DonationStatus.REQUESTED;
  public allocatedAt: Date | null = null;
  public pickedUpAt: Date | null = null;
  public deliveredAt: Date | null = null;

  constructor(food: FoodItem, ngo: NGO, requestedQuantity: number) {
    this.id = IdGenerator.nextRequestId();
    this.foodId = food.id;
    this.foodName = food.name;
    this.donorId = food.donorId;
    this.donorName = food.donorName;
    this.ngoId = ngo.id;
    this.ngoName = ngo.name;
    this.requestedQuantity = requestedQuantity;
    this.unit = food.unit;
    this.pickupAddress = food.pickupAddress;
    this.pickupZone = food.cityZone;
    this.pickupLatitude = food.latitude;
    this.pickupLongitude = food.longitude;
    this.dropAddress = `${ngo.address} (${ngo.cityZone})`;
    this.requestedAt = new Date();
  }

  assignVolunteer(volunteer: Volunteer): void {
    this.volunteerId = volunteer.id;
    this.volunteerName = volunteer.name;
    this.status = DonationStatus.ALLOCATED;
    this.allocatedAt = new Date();
  }

  markPickedUp(): void {
    this.status = DonationStatus.PICKED_UP;
    this.pickedUpAt = new Date();
  }

  markDelivered(): void {
    this.status = DonationStatus.DELIVERED;
    this.deliveredAt = new Date();
  }

  markExpired(): void {
    this.status = DonationStatus.EXPIRED;
    this.volunteerId = null;
    this.volunteerName = null;
  }

  toMap(): DonationRequestDTO {
    const meta = STATUS_META[this.status];
    return {
      id: this.id,
      foodId: this.foodId,
      foodName: this.foodName,
      donorId: this.donorId,
      donorName: this.donorName,
      ngoId: this.ngoId,
      ngoName: this.ngoName,
      requestedQuantity: this.requestedQuantity,
      unit: this.unit,
      pickupAddress: this.pickupAddress,
      pickupZone: this.pickupZone,
      dropAddress: this.dropAddress,
      volunteerId: this.volunteerId,
      volunteerName: this.volunteerName,
      status: this.status,
      statusLabel: meta.label,
      statusColor: meta.color,
      requestedAt: this.requestedAt.toISOString(),
      allocatedAt: this.allocatedAt ? this.allocatedAt.toISOString() : null,
      pickedUpAt: this.pickedUpAt ? this.pickedUpAt.toISOString() : null,
      deliveredAt: this.deliveredAt ? this.deliveredAt.toISOString() : null,
    };
  }
}
