import crypto from 'crypto';
import {
  DashboardStatsDTO,
  DonationStatus,
  FoodType,
  NotificationDTO,
  RaceDemoResultDTO,
  UserRole,
  UserSummaryDTO,
} from '../../src/shared/types.ts';
import {
  APP_CONSTANTS,
  ROLE_LABELS,
  STATUS_META,
  calculateDistanceKm,
} from './constants.ts';
import {
  CookedFood,
  DonationRequest,
  Donor,
  DuplicateUserException,
  EventOrganizer,
  FoodItem,
  Hotel,
  IdGenerator,
  InvalidInputException,
  NGO,
  NoVolunteerAvailableException,
  NotificationMessage,
  PackagedFood,
  RawIngredients,
  Restaurant,
  UnauthorizedException,
  User,
  ValidationUtil,
  Volunteer,
} from './models.ts';

export interface SessionPrincipal {
  userId: string;
  role: UserRole;
  displayName: string;
}

export class DonationManager {
  private static instance: DonationManager | null = null;

  private readonly users = new Map<string, User>();
  private readonly foods = new Map<string, FoodItem>();
  private readonly requests = new Map<string, DonationRequest>();
  private readonly sessions = new Map<string, SessionPrincipal>();
  private readonly foodMutexQueues = new Map<string, Promise<unknown>>();
  private allocationQueue: Promise<unknown> = Promise.resolve();

  private readonly globalNotifications: NotificationMessage[] = [];
  private readonly threadActivityLogs: string[] = [];

  private expiryTimer: ReturnType<typeof setInterval> | null = null;
  private allocatorTimer: ReturnType<typeof setInterval> | null = null;
  private workersRunning = false;

  private constructor() {}

  static getInstance(): DonationManager {
    if (!DonationManager.instance) {
      DonationManager.instance = new DonationManager();
    }
    return DonationManager.instance;
  }

  private async withFoodLock<T>(foodId: string, fn: () => Promise<T> | T): Promise<T> {
    const prev = this.foodMutexQueues.get(foodId) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const chained = prev.then(() => next);
    this.foodMutexQueues.set(foodId, chained);
    await prev;
    try {
      return await fn();
    } finally {
      release();
      if (this.foodMutexQueues.get(foodId) === chained) {
        this.foodMutexQueues.delete(foodId);
      }
    }
  }

  private async withAllocationLock<T>(fn: () => Promise<T> | T): Promise<T> {
    const prev = this.allocationQueue;
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.allocationQueue = prev.then(() => next);
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  logThreadActivity(entry: string): void {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const line = `${hh}:${mm}:${ss} ${entry}`;
    this.threadActivityLogs.unshift(line);
    while (this.threadActivityLogs.length > APP_CONSTANTS.MAX_THREAD_LOGS) {
      this.threadActivityLogs.pop();
    }
  }

  getThreadActivityLogs(): string[] {
    return [...this.threadActivityLogs];
  }

  seedIfEmpty(): void {
    if (this.users.size > 0) return;
    IdGenerator.reset();

    // 6 South Indian Donors (Restaurant, Hotel, EventOrganizer)
    const d1 = this.registerDonor(
      'RESTAURANT',
      'Saravana Bhavan Restaurant',
      'donor1@foodbridge.org',
      'pass123',
      '9840100001',
      '47, Usman Road, T. Nagar, Chennai - 600017',
      'Chennai - T. Nagar',
      'FSSAI-TN-101',
      'South Indian Vegetarian',
      0,
      '',
    );
    const d2 = this.registerDonor(
      'HOTEL',
      'Hotel Annapoorna',
      'donor2@foodbridge.org',
      'pass123',
      '9842200002',
      '72, Diwan Bahadur Road, RS Puram, Coimbatore - 641002',
      'Coimbatore - RS Puram',
      'FSSAI-TN-202',
      '',
      4,
      '',
    );
    const d3 = this.registerDonor(
      'RESTAURANT',
      'Murugan Idli Shop',
      'donor3@foodbridge.org',
      'pass123',
      '9842100003',
      '12, West Masi Street, Meenakshi Amman Temple Area, Madurai - 625001',
      'Madurai - Meenakshi Temple',
      'FSSAI-TN-303',
      'Traditional Tiffin & Meals',
      0,
      '',
    );
    const d4 = this.registerDonor(
      'EVENT_ORGANIZER',
      'Kerala Sadya Caterers',
      'donor4@foodbridge.org',
      'pass123',
      '9847000004',
      '64, Mahatma Gandhi Road, Ernakulam, Kochi - 682016',
      'Kochi - Ernakulam',
      'FSSAI-KL-404',
      '',
      0,
      'Wedding Banquet',
    );
    const d5 = this.registerDonor(
      'HOTEL',
      'Chettinad Palace Hotel',
      'donor5@foodbridge.org',
      'pass123',
      '9840200005',
      '18, Sardar Patel Road, Adyar, Chennai - 600020',
      'Chennai - Adyar',
      'FSSAI-TN-505',
      '',
      5,
      '',
    );
    const d6 = this.registerDonor(
      'EVENT_ORGANIZER',
      'Sri Kapaleeshwarar Temple Festival Annadanam',
      'donor6@foodbridge.org',
      'pass123',
      '9840300006',
      '105, Velachery Main Road, Velachery, Chennai - 600042',
      'Chennai - Velachery',
      'FSSAI-TN-606',
      '',
      0,
      'Temple Festival',
    );

    // 4 South Indian NGOs
    const n1 = this.registerNgo(
      'Anbu Illam Trust',
      'ngo1@foodbridge.org',
      'pass123',
      '9840400011',
      '22, Gandhi Nagar 1st Main Road, Adyar, Chennai - 600020',
      'Chennai - Adyar',
      'NGO-TN-2021-88',
      250,
    );
    const n2 = this.registerNgo(
      'Akshaya Seva Foundation',
      'ngo2@foodbridge.org',
      'pass123',
      '9845000012',
      '29, 11th Main, 4th Block, Jayanagar, Bengaluru - 560011',
      'Bengaluru - Jayanagar',
      'NGO-KA-2019-45',
      220,
    );
    const n3 = this.registerNgo(
      'Thozhan Foundation',
      'ngo3@foodbridge.org',
      'pass123',
      '9840500013',
      '24, 2nd Avenue, Anna Nagar, Chennai - 600040',
      'Chennai - Anna Nagar',
      'NGO-TN-2020-62',
      200,
    );
    const n4 = this.registerNgo(
      'Seva Bharathi South',
      'ngo4@foodbridge.org',
      'pass123',
      '9842300014',
      '33, Cross Cut Road, Gandhipuram, Coimbatore - 641012',
      'Coimbatore - Gandhipuram',
      'NGO-TN-2018-31',
      180,
    );

    // 7 South Indian Volunteers
    const v1 = this.registerVolunteer(
      'Karthik Subramanian',
      'vol1@foodbridge.org',
      'pass123',
      '9840600021',
      '15, North Boag Road, T. Nagar, Chennai - 600017',
      'Chennai - T. Nagar',
      'Electric Scooter',
    );
    const v2 = this.registerVolunteer(
      'Divya Nair',
      'vol2@foodbridge.org',
      'pass123',
      '9847100022',
      '9, Marine Drive Link Road, Ernakulam, Kochi - 682011',
      'Kochi - Ernakulam',
      'Delivery Van',
    );
    const v3 = this.registerVolunteer(
      'Arun Kumar',
      'vol3@foodbridge.org',
      'pass123',
      '9845100023',
      '42, 100 Feet Road, Indiranagar, Bengaluru - 560038',
      'Bengaluru - Indiranagar',
      'Hatchback Car',
    );
    const v4 = this.registerVolunteer(
      'Suresh Reddy',
      'vol4@foodbridge.org',
      'pass123',
      '9849000024',
      '8-2-293, Road No. 12, Banjara Hills, Hyderabad - 500034',
      'Hyderabad - Banjara Hills',
      'Cargo Auto',
    );
    const v5 = this.registerVolunteer(
      'Anjali Menon',
      'vol5@foodbridge.org',
      'pass123',
      '9842400025',
      '55, East Sambandam Road, RS Puram, Coimbatore - 641002',
      'Coimbatore - RS Puram',
      'Electric Scooter',
    );
    const v6 = this.registerVolunteer(
      'Ramesh Babu',
      'vol6@foodbridge.org',
      'pass123',
      '9842500026',
      '8, South Chitrai Street, Madurai - 625001',
      'Madurai - Meenakshi Temple',
      'Two-Wheeler',
    );
    const v7 = this.registerVolunteer(
      'Meenakshi Sundaram',
      'vol7@foodbridge.org',
      'pass123',
      '9845200027',
      '19, Contour Road, Gokulam, Mysuru - 570002',
      'Mysuru - Gokulam',
      'Mini Van',
    );

    const now = Date.now();
    const mins = (m: number) => new Date(now + m * 60_000);
    const hrs = (h: number) => new Date(now + h * 3600_000);

    // 32 Food Items across CookedFood, PackagedFood, RawIngredients
    // --- CookedFood (22 items) ---
    this.addDonation(d1.id, 'Curd Rice', 20, 'kg', FoodType.COOKED, mins(35), d1.address, d1.cityZone,
      'Chilled tempered thayir sadam with pomegranate', { vegetarian: true, servingTemp: 'Chilled', safeHours: 2 });
    this.addDonation(d3.id, 'Soft Idli & Medu Vada', 180, 'pieces', FoodType.COOKED, mins(45), d3.address, d3.cityZone,
      'Steamed idlis and crispy medu vada in thermal crates', { vegetarian: true, servingTemp: 'Hot', safeHours: 4 });
    this.addDonation(d1.id, 'Spiced Buttermilk (Neer Mor)', 25, 'L', FoodType.COOKED, mins(50), d1.address, d1.cityZone,
      'Freshly churned mor with curry leaves and ginger', { vegetarian: true, servingTemp: 'Chilled', safeHours: 2 });
    this.addDonation(d3.id, 'Coconut Chutney & Sambar Packs', 40, 'packs', FoodType.COOKED, mins(55), d3.address, d3.cityZone,
      'Sealed tiffin accompaniment pouches', { vegetarian: true, servingTemp: 'Chilled', safeHours: 2 });
    this.addDonation(d6.id, 'Semiya Payasam', 15, 'L', FoodType.COOKED, mins(58), d6.address, d6.cityZone,
      'Cardamom and cashew vermicelli payasam', { vegetarian: true, servingTemp: 'Warm', safeHours: 2 });
    this.addDonation(d2.id, 'Ven Pongal & Sambar', 25, 'kg', FoodType.COOKED, mins(75), d2.address, d2.cityZone,
      'Ghee pepper pongal with drumstick sambar', { vegetarian: true, servingTemp: 'Hot', safeHours: 4 });
    this.addDonation(d3.id, 'Crispy Masala Dosa & Chutney Boxes', 60, 'boxes', FoodType.COOKED, mins(90), d3.address, d3.cityZone,
      'Packed individually with potato masala', { vegetarian: true, servingTemp: 'Hot', safeHours: 4 });
    this.addDonation(d1.id, 'Sambar Rice', 30, 'kg', FoodType.COOKED, mins(105), d1.address, d1.cityZone,
      'Hot sambar sadam in stainless steel vessels', { vegetarian: true, servingTemp: 'Hot', safeHours: 4 });
    this.addDonation(d2.id, 'Rava Upma', 15, 'kg', FoodType.COOKED, mins(115), d2.address, d2.cityZone,
      'Roasted semolina upma with mustard tempering', { vegetarian: true, servingTemp: 'Hot', safeHours: 4 });
    this.addDonation(d1.id, 'Lemon Rice', 22, 'kg', FoodType.COOKED, hrs(2.2), d1.address, d1.cityZone,
      'Chitranna with roasted peanuts and turmeric', { vegetarian: true, servingTemp: 'Warm', safeHours: 4 });
    this.addDonation(d5.id, 'Parotta with Vegetable Kurma', 45, 'packs', FoodType.COOKED, hrs(2.4), d5.address, d5.cityZone,
      'Flaky Malabar parotta with coconut kurma', { vegetarian: true, servingTemp: 'Hot', safeHours: 4 });
    this.addDonation(d4.id, 'Appam with Vegetable Stew', 35, 'packs', FoodType.COOKED, hrs(2.5), d4.address, d4.cityZone,
      'Lacy rice appam paired with coconut milk stew', { vegetarian: true, servingTemp: 'Warm', safeHours: 4 });
    this.addDonation(d4.id, 'Kerala Sadya Meal Packs', 75, 'packs', FoodType.COOKED, hrs(2.8), d4.address, d4.cityZone,
      'Matta rice, avial, thoran, erissery and sambar', { vegetarian: true, servingTemp: 'Warm', safeHours: 4 });
    this.addDonation(d2.id, 'Bisi Bele Bath', 28, 'kg', FoodType.COOKED, hrs(3),
      '29, 11th Main, 4th Block, Jayanagar, Bengaluru - 560011', 'Bengaluru - Jayanagar',
      'Traditional Karnataka lentil rice with boondi', { vegetarian: true, servingTemp: 'Hot', safeHours: 4 });
    this.addDonation(d5.id, 'Chapati with Kurma', 50, 'packs', FoodType.COOKED, hrs(3.2), d5.address, d5.cityZone,
      'Whole wheat chapatis with spiced vegetable kurma', { vegetarian: true, servingTemp: 'Warm', safeHours: 4 });
    this.addDonation(d4.id, 'Puttu with Kadala Curry', 30, 'packs', FoodType.COOKED, hrs(3.5), d4.address, d4.cityZone,
      'Steamed red rice puttu with black chickpea curry', { vegetarian: true, servingTemp: 'Hot', safeHours: 4 });
    this.addDonation(d1.id, 'Filter Coffee Flasks', 10, 'flasks', FoodType.COOKED, hrs(3.6), d1.address, d1.cityZone,
      'Kumbakonam degree filter coffee in 2L thermosteel flasks', { vegetarian: true, servingTemp: 'Hot', safeHours: 4 });
    this.addDonation(d6.id, 'Tamarind Rice (Puliyogare)', 28, 'kg', FoodType.COOKED, hrs(4), d6.address, d6.cityZone,
      'Temple-style puliyodarai with sesame and peanuts', { vegetarian: true, servingTemp: 'Warm', safeHours: 6 });
    this.addDonation(d5.id, 'Hyderabadi Biryani', 40, 'kg', FoodType.COOKED, hrs(4.2),
      '8-2-293, Road No. 12, Banjara Hills, Hyderabad - 500034', 'Hyderabad - Banjara Hills',
      'Saffron basmati dum biryani with mirchi ka salan', { vegetarian: false, servingTemp: 'Hot', safeHours: 4 });
    this.addDonation(d2.id, 'Vegetable Biryani', 35, 'kg', FoodType.COOKED, hrs(4.5), d2.address, d2.cityZone,
      'Aromatic seeraga samba vegetable biryani with raita', { vegetarian: true, servingTemp: 'Hot', safeHours: 4 });
    this.addDonation(d6.id, 'Rava Kesari', 12, 'kg', FoodType.COOKED, hrs(5), d6.address, d6.cityZone,
      'Saffron ghee kesari bath with raisins', { vegetarian: true, servingTemp: 'Warm', safeHours: 4 });
    this.addDonation(d3.id, 'Cooked Meal Boxes', 60, 'boxes', FoodType.COOKED, hrs(5.5),
      '42, 100 Feet Road, Indiranagar, Bengaluru - 560038', 'Bengaluru - Indiranagar',
      'Balanced rice, sambar, poriyal and curd boxes', { vegetarian: true, servingTemp: 'Warm', safeHours: 4 });

    // --- PackagedFood (7 items) ---
    this.addDonation(d1.id, 'Toned Milk Packets', 80, 'L', FoodType.PACKAGED, hrs(8),
      '24, 2nd Avenue, Anna Nagar, Chennai - 600040', 'Chennai - Anna Nagar',
      'Chilled Aavin sealed 500ml pouches', { sealIntact: true, batchCode: 'AAVIN-500', safeHours: 12 });
    this.addDonation(d5.id, 'Bread & Buns', 45, 'packs', FoodType.PACKAGED, hrs(16), d5.address, d5.cityZone,
      'Fresh bakery milk bread and sweet buns', { sealIntact: true, batchCode: 'BAK-224', safeHours: 24 });
    this.addDonation(d2.id, 'Mysore Pak Boxes', 30, 'boxes', FoodType.PACKAGED, hrs(36),
      '19, Contour Road, Gokulam, Mysuru - 570002', 'Mysuru - Gokulam',
      'Ghee Mysore Pak sealed festive boxes', { sealIntact: true, batchCode: 'MYS-881', safeHours: 72 });
    this.addDonation(d3.id, 'Biscuits & Packaged Snacks', 70, 'packs', FoodType.PACKAGED, hrs(48), d3.address, d3.cityZone,
      'Sealed tea biscuits and roasted peanut packs', { sealIntact: true, batchCode: 'SNK-410', safeHours: 120 });
    this.addDonation(d4.id, 'Kerala Banana Chips', 50, 'packs', FoodType.PACKAGED, hrs(72), d4.address, d4.cityZone,
      'Nendran banana chips fried in pure coconut oil', { sealIntact: true, batchCode: 'KBC-309', safeHours: 168 });
    this.addDonation(d6.id, 'Traditional Murukku Packs', 60, 'packs', FoodType.PACKAGED, hrs(96), d6.address, d6.cityZone,
      'Hand-twisted Manapparai murukku in sealed pouches', { sealIntact: true, batchCode: 'MRK-772', safeHours: 168 });
    this.addDonation(d5.id, 'Bottled Water & Fruit Juice', 100, 'bottles', FoodType.PACKAGED, hrs(144), d5.address, d5.cityZone,
      'Sealed 1L water bottles and mango juice tetrapaks', { sealIntact: true, batchCode: 'BEV-905', safeHours: 720 });

    // --- RawIngredients (3 items) ---
    this.addDonation(d2.id, 'Fresh Vegetables & Fruits', 45, 'kg', FoodType.RAW_INGREDIENTS, hrs(30),
      '33, Cross Cut Road, Gandhipuram, Coimbatore - 641012', 'Coimbatore - Gandhipuram',
      'Drumsticks, brinjal, tomatoes, plantains and yelakki bananas', { requiresRefrigeration: false, safeHours: 48 });
    this.addDonation(d6.id, 'Toor Dal & Wheat Flour', 60, 'kg', FoodType.RAW_INGREDIENTS, hrs(168), d6.address, d6.cityZone,
      'Unopened 10kg sacks of toor dal and chakki atta', { requiresRefrigeration: false, safeHours: 336 });
    this.addDonation(d1.id, 'Sona Masoori & Ponni Rice Bags', 100, 'kg', FoodType.RAW_INGREDIENTS, hrs(240), d1.address, d1.cityZone,
      'Four 25kg sealed raw rice bags ready for NGO kitchens', { requiresRefrigeration: false, safeHours: 720 });

    this.logThreadActivity(
      `[SeedDataLoader] Loaded 6 South Indian Donors (${d1.id}..${d6.id}), 4 NGOs (${n1.id}..${n4.id}), 7 Volunteers (${v1.id}..${v7.id}), and 32 Food Items.`,
    );
  }

  startBackgroundWorkers(): void {
    if (this.workersRunning) return;
    this.workersRunning = true;

    this.expiryTimer = setInterval(() => {
      void this.checkAndMarkExpiredFood();
    }, APP_CONSTANTS.EXPIRY_CHECK_INTERVAL_MS);

    this.allocatorTimer = setInterval(() => {
      void this.processPendingAllocations();
    }, APP_CONSTANTS.ALLOCATOR_POLL_INTERVAL_MS);

    this.logThreadActivity(
      '[Startup] Background workers started (ExpiryMonitor every 15s, VolunteerAllocator every 10s).',
    );
  }

  stopBackgroundWorkers(): void {
    if (this.expiryTimer) clearInterval(this.expiryTimer);
    if (this.allocatorTimer) clearInterval(this.allocatorTimer);
    this.workersRunning = false;
  }

  private ensureEmailAvailable(email: string): void {
    const clean = ValidationUtil.validateEmail(email);
    if (clean === APP_CONSTANTS.ADMIN_EMAIL.toLowerCase()) {
      throw new DuplicateUserException(`Email is reserved for system admin: ${clean}`);
    }
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === clean) {
        throw new DuplicateUserException(`A user already exists with email: ${clean}`);
      }
    }
  }

  registerDonor(
    donorType: string,
    name: string,
    email: string,
    password: string,
    phone: string,
    address: string,
    cityZone: string,
    licenseNumber: string,
    cuisineType: string,
    starRating: number,
    eventScale: string,
  ): Donor {
    this.ensureEmailAvailable(email);
    const type = (donorType || 'RESTAURANT').trim().toUpperCase();
    const license = licenseNumber.trim() || 'FSSAI-PENDING';

    let donor: Donor;
    if (type === 'HOTEL') {
      donor = new Hotel(
        name,
        email,
        password,
        phone,
        address,
        cityZone,
        license,
        starRating <= 0 ? 4 : starRating,
      );
    } else if (type === 'EVENT_ORGANIZER' || type === 'EVENT') {
      donor = new EventOrganizer(
        name,
        email,
        password,
        phone,
        address,
        cityZone,
        license,
        eventScale.trim() || 'Medium',
      );
    } else {
      donor = new Restaurant(
        name,
        email,
        password,
        phone,
        address,
        cityZone,
        license,
        cuisineType.trim() || 'Multi-Cuisine',
      );
    }

    this.users.set(donor.id, donor);
    this.queueNotification(
      donor.id,
      'WELCOME',
      `Welcome ${donor.name}! Ready to donate surplus food.`,
    );
    return donor;
  }

  registerNgo(
    name: string,
    email: string,
    password: string,
    phone: string,
    address: string,
    cityZone: string,
    registrationNumber: string,
    beneficiaryCapacity: number,
  ): NGO {
    this.ensureEmailAvailable(email);
    const regNo =
      registrationNumber.trim() || `NGO-REG-${Date.now() % 10000}`;
    const ngo = new NGO(
      name,
      email,
      password,
      phone,
      address,
      cityZone,
      regNo,
      beneficiaryCapacity <= 0 ? 100 : beneficiaryCapacity,
    );
    this.users.set(ngo.id, ngo);
    this.queueNotification(
      ngo.id,
      'WELCOME',
      `Welcome ${ngo.name}! Browse urgent donations now.`,
    );
    return ngo;
  }

  registerVolunteer(
    name: string,
    email: string,
    password: string,
    phone: string,
    address: string,
    cityZone: string,
    vehicleType: string,
  ): Volunteer {
    this.ensureEmailAvailable(email);
    const vehicle = vehicleType.trim() || 'Two-Wheeler';
    const volunteer = new Volunteer(
      name,
      email,
      password,
      phone,
      address,
      cityZone,
      vehicle,
    );
    this.users.set(volunteer.id, volunteer);
    this.queueNotification(
      volunteer.id,
      'WELCOME',
      `Welcome ${volunteer.name}! You are online for deliveries.`,
    );
    void this.processPendingAllocations();
    return volunteer;
  }

  login(email: string, password: string): { token: string; user: UserSummaryDTO } {
    const cleanEmail = ValidationUtil.validateEmail(email);
    const cleanPass = ValidationUtil.requireNonBlank(password, 'Password');

    if (
      cleanEmail === APP_CONSTANTS.ADMIN_EMAIL.toLowerCase() &&
      cleanPass === APP_CONSTANTS.ADMIN_PASSWORD
    ) {
      const token = crypto.randomUUID();
      this.sessions.set(token, {
        userId: 'ADMIN',
        role: UserRole.ADMIN,
        displayName: APP_CONSTANTS.ADMIN_NAME,
      });
      return {
        token,
        user: {
          id: 'ADMIN',
          name: APP_CONSTANTS.ADMIN_NAME,
          email: APP_CONSTANTS.ADMIN_EMAIL,
          phone: '9840000000',
          address: '10, Cathedral Road, Gopalapuram, Chennai - 600086',
          cityZone: 'Chennai - Anna Nagar',
          role: UserRole.ADMIN,
          roleLabel: ROLE_LABELS[UserRole.ADMIN],
          dashboardInfo:
            'Full system visibility: donations, volunteers & live concurrency monitor',
        },
      };
    }

    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === cleanEmail && user.checkPassword(cleanPass)) {
        const token = crypto.randomUUID();
        this.sessions.set(token, {
          userId: user.id,
          role: user.getRole(),
          displayName: user.name,
        });
        return { token, user: user.toSummaryMap() };
      }
    }

    throw new InvalidInputException('Invalid email or password.');
  }

  logout(token?: string | null): void {
    if (token) {
      this.sessions.delete(token);
    }
  }

  getSession(token?: string | null): SessionPrincipal | null {
    if (!token || !token.trim()) return null;
    return this.sessions.get(token.trim()) ?? null;
  }

  requireSession(
    token?: string | null,
    requiredRole?: UserRole | null,
  ): SessionPrincipal {
    const principal = this.getSession(token);
    if (!principal) {
      throw new UnauthorizedException('Authentication required. Please log in first.');
    }
    if (requiredRole && principal.role !== requiredRole) {
      throw new InvalidInputException(
        `Action requires role ${ROLE_LABELS[requiredRole]}, but logged in as ${ROLE_LABELS[principal.role]}.`,
      );
    }
    return principal;
  }

  findUserById(userId: string): User | undefined {
    return this.users.get(userId);
  }

  addDonation(
    donorId: string,
    name: string,
    quantity: number,
    unit: string,
    type: FoodType,
    expiryTime: Date,
    pickupAddress: string,
    cityZone: string,
    notes = '',
    extras: Record<string, unknown> = {},
  ): FoodItem {
    const user = this.users.get(donorId);
    if (!(user instanceof Donor)) {
      throw new InvalidInputException(`Valid donor account not found for ID: ${donorId}`);
    }
    const zone = cityZone.trim() || user.cityZone;
    const address = pickupAddress.trim() || user.address;

    const safeHoursOverride =
      typeof extras.safeHours === 'number' && extras.safeHours > 0
        ? extras.safeHours
        : undefined;

    let food: FoodItem;
    if (type === FoodType.COOKED) {
      const vegRaw = extras.vegetarian;
      const veg = vegRaw === undefined ? true : String(vegRaw).toLowerCase() !== 'false';
      const temp = String(extras.servingTemp ?? 'Warm');
      food = new CookedFood(
        user.id,
        user.name,
        name,
        quantity,
        unit,
        expiryTime,
        address,
        zone,
        notes,
        veg,
        temp,
        safeHoursOverride,
      );
    } else if (type === FoodType.PACKAGED) {
      const sealRaw = extras.sealIntact;
      const seal = sealRaw === undefined ? true : String(sealRaw).toLowerCase() !== 'false';
      const batch = String(extras.batchCode ?? 'BATCH-STD');
      food = new PackagedFood(
        user.id,
        user.name,
        name,
        quantity,
        unit,
        expiryTime,
        address,
        zone,
        notes,
        seal,
        batch,
        safeHoursOverride,
      );
    } else {
      const fridge = Boolean(extras.requiresRefrigeration);
      food = new RawIngredients(
        user.id,
        user.name,
        name,
        quantity,
        unit,
        expiryTime,
        address,
        zone,
        notes,
        fridge,
        safeHoursOverride,
      );
    }

    this.foods.set(food.id, food);
    user.incrementDonationsCount();

    this.queueNotification(
      user.id,
      'DONATION_ADDED',
      `Listed ${food.initialQuantity} ${food.unit} of ${food.name}.`,
    );
    this.notifyAllNgos(
      'NEW_FOOD',
      `New donation available: ${food.name} (${food.availableQuantity} ${food.unit}) in ${food.cityZone}.`,
    );

    return food;
  }

  async cancelDonation(foodId: string, donorId: string): Promise<void> {
    await this.withFoodLock(foodId, () => {
      const food = this.foods.get(foodId);
      if (!food) {
        throw new InvalidInputException(`Donation not found: ${foodId}`);
      }
      if (food.donorId !== donorId) {
        throw new InvalidInputException('You can only cancel your own donations.');
      }
      if (
        food.status !== DonationStatus.AVAILABLE ||
        food.availableQuantity <= 0
      ) {
        throw new InvalidInputException(
          'Only donations with AVAILABLE status can be cancelled.',
        );
      }
      if (food.availableQuantity === food.initialQuantity) {
        this.foods.delete(foodId);
        this.queueNotification(
          donorId,
          'DONATION_CANCELLED',
          `Cancelled donation: ${food.name}.`,
        );
      } else {
        food.reduceInitialQuantityByRemaining();
        this.syncFoodStatusWithRequests(food);
        this.queueNotification(
          donorId,
          'DONATION_CANCELLED',
          `Cancelled remaining unrequested portion of ${food.name}.`,
        );
      }
    });
  }

  searchFood(nameQuery?: string | null, type?: FoodType | null): FoodItem[] {
    const clean = (nameQuery ?? '').trim().toLowerCase();
    return Array.from(this.foods.values())
      .filter(
        (f) =>
          f.status === DonationStatus.AVAILABLE &&
          f.availableQuantity > 0 &&
          !f.isExpired(),
      )
      .filter((f) => !type || f.getFoodType() === type)
      .filter(
        (f) =>
          !clean ||
          f.name.toLowerCase().includes(clean) ||
          f.donorName.toLowerCase().includes(clean) ||
          f.cityZone.toLowerCase().includes(clean),
      )
      .sort((a, b) => a.expiryTime.getTime() - b.expiryTime.getTime());
  }

  getAllDonationsSorted(): FoodItem[] {
    return Array.from(this.foods.values()).sort(
      (a, b) => a.expiryTime.getTime() - b.expiryTime.getTime(),
    );
  }

  getDonationsByDonor(donorId: string): FoodItem[] {
    return Array.from(this.foods.values())
      .filter((f) => f.donorId === donorId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async requestFood(
    ngoId: string,
    foodId: string,
    quantity: number,
  ): Promise<DonationRequest> {
    const user = this.users.get(ngoId);
    if (!(user instanceof NGO)) {
      throw new InvalidInputException('Valid NGO account required to request food.');
    }

    const request = await this.withFoodLock(foodId, async () => {
      const food = this.foods.get(foodId);
      if (!food) {
        throw new InvalidInputException(`Food item not found: ${foodId}`);
      }
      food.deductQuantity(quantity);

      const validQty = ValidationUtil.validatePositiveDouble(quantity, 'Quantity');
      const req = new DonationRequest(food, user, validQty);
      this.requests.set(req.id, req);
      this.syncFoodStatusWithRequests(food);

      this.queueNotification(
        user.id,
        'REQUEST_CREATED',
        `Requested ${req.requestedQuantity} ${req.unit} of ${food.name}.`,
      );
      this.queueNotification(
        food.donorId,
        'FOOD_REQUESTED',
        `${user.name} requested ${req.requestedQuantity} ${req.unit} of ${food.name}.`,
      );
      return req;
    });

    await this.processPendingAllocations();
    return request;
  }

  async allocateNearestVolunteer(requestId: string): Promise<DonationRequest> {
    return this.withAllocationLock(() => {
      const request = this.requests.get(requestId);
      if (!request) {
        throw new InvalidInputException(`Request not found: ${requestId}`);
      }
      if (request.status !== DonationStatus.REQUESTED) {
        return request;
      }

      const freeVolunteers = Array.from(this.users.values()).filter(
        (u): u is Volunteer => u instanceof Volunteer && u.available,
      );

      if (freeVolunteers.length === 0) {
        throw new NoVolunteerAvailableException(
          `No free volunteers currently available for request ${requestId}.`,
        );
      }

      let nearest = freeVolunteers[0];
      let minDist = calculateDistanceKm(
        nearest.latitude,
        nearest.longitude,
        request.pickupLatitude,
        request.pickupLongitude,
      );

      for (const vol of freeVolunteers.slice(1)) {
        const dist = calculateDistanceKm(
          vol.latitude,
          vol.longitude,
          request.pickupLatitude,
          request.pickupLongitude,
        );
        if (dist < minDist) {
          minDist = dist;
          nearest = vol;
        }
      }

      nearest.allocate(request.id);
      request.assignVolunteer(nearest);

      const food = this.foods.get(request.foodId);
      if (food) {
        this.syncFoodStatusWithRequests(food);
      }

      this.logThreadActivity(
        `[VolunteerAllocator] Allocated nearest volunteer ${nearest.name} (${minDist} km away) to ${request.id}`,
      );

      this.queueNotification(
        nearest.id,
        'TASK_ASSIGNED',
        `New pickup task ${request.id}: ${request.foodName} from ${request.pickupAddress} -> ${request.dropAddress}`,
      );
      this.queueNotification(
        request.ngoId,
        'VOLUNTEER_ASSIGNED',
        `${nearest.name} assigned to deliver ${request.foodName} (${request.id}).`,
      );
      this.queueNotification(
        request.donorId,
        'VOLUNTEER_ASSIGNED',
        `Volunteer ${nearest.name} will pick up ${request.foodName}.`,
      );

      return request;
    });
  }

  async processPendingAllocations(): Promise<number> {
    const pending = Array.from(this.requests.values())
      .filter((r) => r.status === DonationStatus.REQUESTED)
      .sort((a, b) => {
        const fa = this.foods.get(a.foodId);
        const fb = this.foods.get(b.foodId);
        const ta = fa ? fa.expiryTime.getTime() : Number.MAX_SAFE_INTEGER;
        const tb = fb ? fb.expiryTime.getTime() : Number.MAX_SAFE_INTEGER;
        return ta - tb;
      });

    let count = 0;
    for (const req of pending) {
      try {
        await this.allocateNearestVolunteer(req.id);
        count++;
      } catch (err) {
        if (err instanceof NoVolunteerAvailableException) {
          this.logThreadActivity(`[VolunteerAllocator] Waiting queue: ${err.message}`);
          break;
        }
      }
    }
    return count;
  }

  markPickedUp(requestId: string, volunteerId: string): DonationRequest {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new InvalidInputException(`Request not found: ${requestId}`);
    }
    if (!request.volunteerId || request.volunteerId !== volunteerId) {
      throw new InvalidInputException('This task is not assigned to you.');
    }
    if (request.status !== DonationStatus.ALLOCATED) {
      throw new InvalidInputException(
        `Request must be ALLOCATED before pickup. Current: ${STATUS_META[request.status].label}`,
      );
    }

    request.markPickedUp();
    const food = this.foods.get(request.foodId);
    if (food) {
      this.syncFoodStatusWithRequests(food);
    }

    this.queueNotification(
      request.ngoId,
      'PICKED_UP',
      `${request.volunteerName} picked up ${request.foodName} and is on the way.`,
    );
    this.queueNotification(
      request.donorId,
      'PICKED_UP',
      `${request.foodName} has been picked up by ${request.volunteerName}.`,
    );
    return request;
  }

  async markDelivered(
    requestId: string,
    volunteerId: string,
  ): Promise<DonationRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new InvalidInputException(`Request not found: ${requestId}`);
    }
    if (!request.volunteerId || request.volunteerId !== volunteerId) {
      throw new InvalidInputException('This task is not assigned to you.');
    }
    if (request.status !== DonationStatus.PICKED_UP) {
      throw new InvalidInputException(
        `Request must be PICKED_UP before delivery. Current: ${STATUS_META[request.status].label}`,
      );
    }

    request.markDelivered();

    const vol = this.users.get(volunteerId);
    if (vol instanceof Volunteer) {
      vol.completedDeliveries++;
      vol.release();
    }

    const food = this.foods.get(request.foodId);
    if (food) {
      this.syncFoodStatusWithRequests(food);
    }

    this.queueNotification(
      volunteerId,
      'DELIVERY_COMPLETE',
      `Delivered ${request.foodName} (${request.id}). You are free for new tasks!`,
    );
    this.queueNotification(
      request.ngoId,
      'DELIVERED',
      `Received ${request.requestedQuantity} ${request.unit} of ${request.foodName}.`,
    );
    this.queueNotification(
      request.donorId,
      'DELIVERED',
      `Your donation ${request.foodName} was delivered to ${request.ngoName}!`,
    );

    await this.processPendingAllocations();
    return request;
  }

  private syncFoodStatusWithRequests(food: FoodItem): void {
    if (food.status === DonationStatus.EXPIRED) return;
    if (food.availableQuantity > 0) {
      food.status = DonationStatus.AVAILABLE;
      return;
    }

    const related = Array.from(this.requests.values()).filter(
      (r) => r.foodId === food.id,
    );
    if (related.length === 0) return;

    const allDelivered = related.every(
      (r) => r.status === DonationStatus.DELIVERED,
    );
    const anyPickedUp = related.some(
      (r) => r.status === DonationStatus.PICKED_UP,
    );
    const anyAllocated = related.some(
      (r) => r.status === DonationStatus.ALLOCATED,
    );
    const anyRequested = related.some(
      (r) => r.status === DonationStatus.REQUESTED,
    );

    if (allDelivered) food.status = DonationStatus.DELIVERED;
    else if (anyPickedUp) food.status = DonationStatus.PICKED_UP;
    else if (anyAllocated) food.status = DonationStatus.ALLOCATED;
    else if (anyRequested) food.status = DonationStatus.REQUESTED;
  }

  async checkAndMarkExpiredFood(): Promise<number> {
    let expiredNow = 0;
    const now = Date.now();
    for (const food of Array.from(this.foods.values())) {
      await this.withFoodLock(food.id, async () => {
        if (
          food.status !== DonationStatus.DELIVERED &&
          food.status !== DonationStatus.EXPIRED &&
          now > food.expiryTime.getTime()
        ) {
          food.markExpired();
          expiredNow++;

          for (const req of this.requests.values()) {
            if (
              req.foodId === food.id &&
              (req.status === DonationStatus.REQUESTED ||
                req.status === DonationStatus.ALLOCATED)
            ) {
              const volId = req.volunteerId;
              req.markExpired();
              if (volId) {
                const u = this.users.get(volId);
                if (u instanceof Volunteer) {
                  u.release();
                }
                this.queueNotification(
                  volId,
                  'TASK_EXPIRED',
                  `Pickup cancelled because ${food.name} expired.`,
                );
              }
              this.queueNotification(
                req.ngoId,
                'FOOD_EXPIRED',
                `Requested item ${food.name} expired before pickup.`,
              );
            }
          }

          this.queueNotification(
            food.donorId,
            'FOOD_EXPIRED',
            `Food item '${food.name}' reached expiry and was marked EXPIRED.`,
          );
        }
      });
    }

    if (expiredNow > 0) {
      this.logThreadActivity(
        `[ExpiryMonitor] Marked ${expiredNow} expired food item(s).`,
      );
      await this.processPendingAllocations();
    }
    return expiredNow;
  }

  queueNotification(userId: string, category: string, message: string): void {
    const msg = new NotificationMessage(userId, category, message);
    const target = this.users.get(userId);
    if (target) {
      target.notifyUser(msg);
    }
    this.globalNotifications.unshift(msg);
    while (this.globalNotifications.length > 150) {
      this.globalNotifications.pop();
    }
  }

  private notifyAllNgos(category: string, message: string): void {
    for (const user of this.users.values()) {
      if (user.getRole() === UserRole.NGO) {
        this.queueNotification(user.id, category, message);
      }
    }
  }

  getNotificationsForUser(userId?: string | null): NotificationDTO[] {
    if (!userId || !userId.trim() || userId.toUpperCase() === 'ADMIN') {
      return this.globalNotifications.map((n) => n.toDTO());
    }
    const user = this.users.get(userId);
    if (user) {
      return user.getNotifications().map((n) => n.toDTO());
    }
    return this.globalNotifications
      .filter((n) => n.userId === userId)
      .map((n) => n.toDTO());
  }

  getRequestsFiltered(
    ngoId?: string | null,
    volunteerId?: string | null,
    donorId?: string | null,
  ): DonationRequest[] {
    return Array.from(this.requests.values())
      .filter((r) => !ngoId || r.ngoId === ngoId)
      .filter((r) => !volunteerId || r.volunteerId === volunteerId)
      .filter((r) => !donorId || r.donorId === donorId)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  getAllVolunteers(): Volunteer[] {
    return Array.from(this.users.values())
      .filter((u): u is Volunteer => u instanceof Volunteer)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  getAllUserSummaries(): UserSummaryDTO[] {
    return Array.from(this.users.values()).map((u) => u.toSummaryMap());
  }

  getDashboardStats(
    userId?: string | null,
    role?: UserRole | null,
  ): DashboardStatsDTO {
    const allFoods = Array.from(this.foods.values());
    const allRequests = Array.from(this.requests.values());
    const volunteers = this.getAllVolunteers();

    const stats: DashboardStatsDTO = {
      totalDonated: allFoods.length,
      availableCount: allFoods.filter(
        (f) =>
          f.status === DonationStatus.AVAILABLE &&
          f.availableQuantity > 0 &&
          !f.isExpired(),
      ).length,
      totalDelivered: allRequests.filter(
        (r) => r.status === DonationStatus.DELIVERED,
      ).length,
      totalExpired: allFoods.filter(
        (f) => f.status === DonationStatus.EXPIRED || f.isExpired(),
      ).length,
      activeRequests: allRequests.filter(
        (r) =>
          r.status === DonationStatus.REQUESTED ||
          r.status === DonationStatus.ALLOCATED ||
          r.status === DonationStatus.PICKED_UP,
      ).length,
      freeVolunteers: volunteers.filter((v) => v.available).length,
      totalVolunteers: volunteers.length,
    };

    if (userId && role === UserRole.DONOR) {
      const myFoods = this.getDonationsByDonor(userId);
      stats.myDonations = myFoods.length;
      stats.myDelivered = myFoods.filter(
        (f) => f.status === DonationStatus.DELIVERED,
      ).length;
      stats.myExpired = myFoods.filter(
        (f) => f.status === DonationStatus.EXPIRED,
      ).length;
    } else if (userId && role === UserRole.NGO) {
      const myReqs = this.getRequestsFiltered(userId, null, null);
      stats.myRequests = myReqs.length;
      stats.myDelivered = myReqs.filter(
        (r) => r.status === DonationStatus.DELIVERED,
      ).length;
      stats.myActive = myReqs.filter(
        (r) => !STATUS_META[r.status].terminal,
      ).length;
    } else if (userId && role === UserRole.VOLUNTEER) {
      const myTasks = this.getRequestsFiltered(null, userId, null);
      const u = this.users.get(userId);
      stats.myTasks = myTasks.length;
      stats.myDelivered = u instanceof Volunteer ? u.completedDeliveries : 0;
      stats.isVolunteerFree = u instanceof Volunteer ? u.available : false;
    }

    return stats;
  }

  cleanupFoodAndRequestsForTest(foodId: string): void {
    this.foods.delete(foodId);
    for (const [reqId, req] of Array.from(this.requests.entries())) {
      if (req.foodId === foodId) {
        if (req.volunteerId) {
          const u = this.users.get(req.volunteerId);
          if (u instanceof Volunteer) {
            u.release();
          }
        }
        this.requests.delete(reqId);
      }
    }
  }

  async runRaceConditionDemo(): Promise<RaceDemoResultDTO> {
    const logs: string[] = [];
    let successCount = 0;
    let failureCount = 0;
    let winnerThread = 'NONE';

    const donor = Array.from(this.users.values()).find(
      (u): u is Donor => u instanceof Donor,
    );
    const ngo = Array.from(this.users.values()).find(
      (u): u is NGO => u instanceof NGO,
    );

    if (!donor || !ngo) {
      return {
        summary: 'At least 1 Donor and 1 NGO are required for RaceConditionDemo.',
        winnerThread,
        successCount: 0,
        failureCount: 0,
        logs,
      };
    }

    const demoFood = this.addDonation(
      donor.id,
      'Race-Test Meal Pack',
      10,
      'kg',
      FoodType.COOKED,
      new Date(Date.now() + 2 * 3600_000),
      donor.address,
      donor.cityZone,
      'Temporary item for 10-worker concurrency test',
    );

    const workerCount = 10;
    await Promise.all(
      Array.from({ length: workerCount }, async (_, idx) => {
        const wName = `NGO-Worker-${idx + 1}`;
        try {
          await this.requestFood(ngo.id, demoFood.id, 10);
          successCount++;
          winnerThread = wName;
          const msg = `[${wName}] SUCCESS: Claimed 10.0 kg of ${demoFood.id}`;
          logs.push(msg);
          this.logThreadActivity(msg);
        } catch (err) {
          failureCount++;
          const e = err as Error;
          const msg = `[${wName}] BLOCKED SAFELY (${e.name === 'Error' ? 'InsufficientQuantityException' : e.name}): ${e.message}`;
          logs.push(msg);
        }
      }),
    );

    this.cleanupFoodAndRequestsForTest(demoFood.id);

    const summary = `Fired 10 simultaneous workers at 1 donation (10 kg). Success: ${successCount} (${winnerThread}), Safely Blocked: ${failureCount}.`;
    this.logThreadActivity(`[RaceConditionDemo] ${summary}`);

    return {
      summary,
      winnerThread,
      successCount,
      failureCount,
      logs,
    };
  }
}
