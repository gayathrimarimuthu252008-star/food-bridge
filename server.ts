import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { FoodType, UserRole } from './src/shared/types.ts';
import { APP_CONSTANTS, getAvailableZones } from './server/foodbridge/constants.ts';
import { DonationManager } from './server/foodbridge/donationManager.ts';
import { DomainException, InvalidInputException } from './server/foodbridge/models.ts';

function extractToken(req: Request): string | null {
  const headerToken = req.header('X-Auth-Token');
  if (headerToken && headerToken.trim()) {
    return headerToken.trim();
  }
  const auth = req.header('Authorization');
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}

function parseFoodType(value?: string | null): FoodType | null {
  if (!value || !value.trim()) return null;
  const upper = value.trim().toUpperCase();
  if (upper === FoodType.COOKED) return FoodType.COOKED;
  if (upper === FoodType.PACKAGED) return FoodType.PACKAGED;
  if (upper === FoodType.RAW_INGREDIENTS) return FoodType.RAW_INGREDIENTS;
  return null;
}

function parseUserRole(value?: string | null): UserRole | null {
  if (!value || !value.trim()) return null;
  const upper = value.trim().toUpperCase();
  if (upper === UserRole.DONOR) return UserRole.DONOR;
  if (upper === UserRole.NGO) return UserRole.NGO;
  if (upper === UserRole.VOLUNTEER) return UserRole.VOLUNTEER;
  if (upper === UserRole.ADMIN) return UserRole.ADMIN;
  return null;
}

function parseExpiryDate(body: Record<string, unknown>): Date {
  const expiryStr = typeof body.expiryTime === 'string' ? body.expiryTime.trim() : '';
  if (expiryStr) {
    const parsed = new Date(expiryStr);
    if (Number.isNaN(parsed.getTime())) {
      throw new InvalidInputException('Invalid expiryTime format.');
    }
    return parsed;
  }
  const mins = Number(body.expiryMinutes ?? -1);
  if (Number.isFinite(mins) && mins > 0) {
    return new Date(Date.now() + mins * 60_000);
  }
  throw new InvalidInputException('Expiry time (or expiryMinutes) is required.');
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const manager = DonationManager.getInstance();
  manager.seedIfEmpty();
  manager.startBackgroundWorkers();

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'UP', serverTime: new Date().toISOString() });
  });

  app.get('/api/demo/users', (_req, res) => {
    res.json({
      users: manager.getAllUserSummaries(),
      zones: getAvailableZones(),
      adminHint: {
        email: APP_CONSTANTS.ADMIN_EMAIL,
        password: APP_CONSTANTS.ADMIN_PASSWORD,
      },
    });
  });

  app.post('/api/auth/register', (req, res) => {
    const body = req.body ?? {};
    const role = parseUserRole(String(body.role ?? ''));
    if (!role || role === UserRole.ADMIN) {
      throw new InvalidInputException('Role must be DONOR, NGO, or VOLUNTEER.');
    }

    const name = String(body.name ?? '');
    const email = String(body.email ?? '');
    const password = String(body.password ?? '');
    const phone = String(body.phone ?? '');
    const address = String(body.address ?? '');
    const cityZone = String(body.cityZone ?? 'Chennai - T. Nagar');

    if (role === UserRole.DONOR) {
      const donorType = String(body.donorType ?? 'RESTAURANT');
      const license = String(body.licenseNumber ?? 'FSSAI-NEW');
      const extraInfo = String(body.extraInfo ?? '');
      const stars = Number(body.starRating ?? 4);
      manager.registerDonor(
        donorType,
        name,
        email,
        password,
        phone,
        address,
        cityZone,
        license,
        extraInfo,
        stars,
        extraInfo,
      );
    } else if (role === UserRole.NGO) {
      const regNo = String(body.registrationNumber ?? '');
      const cap = Number(body.beneficiaryCapacity ?? 100);
      manager.registerNgo(name, email, password, phone, address, cityZone, regNo, cap);
    } else {
      const vehicleType = String(body.vehicleType ?? 'Two-Wheeler');
      manager.registerVolunteer(name, email, password, phone, address, cityZone, vehicleType);
    }

    const loginResult = manager.login(email, password);
    res.status(201).json(loginResult);
  });

  app.post('/api/auth/login', (req, res) => {
    const body = req.body ?? {};
    const result = manager.login(String(body.email ?? ''), String(body.password ?? ''));
    res.json(result);
  });

  app.post('/api/auth/logout', (req, res) => {
    manager.logout(extractToken(req));
    res.json({ message: 'Logged out successfully.' });
  });

  app.get('/api/auth/me', (req, res) => {
    const principal = manager.requireSession(extractToken(req));
    if (principal.role === UserRole.ADMIN) {
      res.json({
        user: {
          id: 'ADMIN',
          name: APP_CONSTANTS.ADMIN_NAME,
          email: APP_CONSTANTS.ADMIN_EMAIL,
          phone: '9840000000',
          address: '10, Cathedral Road, Gopalapuram, Chennai - 600086',
          cityZone: 'Chennai - Anna Nagar',
          role: UserRole.ADMIN,
          roleLabel: 'Admin',
          dashboardInfo:
            'Full system visibility: donations, volunteers & live concurrency monitor',
        },
      });
      return;
    }

    const user = manager.findUserById(principal.userId);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Session user no longer exists.' });
      return;
    }
    res.json({ user: user.toSummaryMap() });
  });

  app.get('/api/donations', (req, res) => {
    const typeParam = typeof req.query.type === 'string' ? req.query.type : undefined;
    const searchParam = typeof req.query.q === 'string' ? req.query.q : undefined;
    const availableOnly =
      typeof req.query.availableOnly === 'string' ? req.query.availableOnly : 'true';
    const donorId = typeof req.query.donorId === 'string' ? req.query.donorId : undefined;

    let items;
    if (donorId && donorId.trim()) {
      items = manager.getDonationsByDonor(donorId.trim());
    } else if (availableOnly.toLowerCase() === 'false') {
      items = manager.getAllDonationsSorted();
    } else {
      items = manager.searchFood(searchParam, parseFoodType(typeParam));
    }

    res.json({ donations: items.map((f) => f.toMap()) });
  });

  app.post('/api/donations', (req, res) => {
    const principal = manager.requireSession(extractToken(req), UserRole.DONOR);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const type = parseFoodType(String(body.foodType ?? ''));
    if (!type) {
      throw new InvalidInputException(
        'Invalid foodType. Use COOKED, PACKAGED, or RAW_INGREDIENTS.',
      );
    }

    const expiryTime = parseExpiryDate(body);
    const created = manager.addDonation(
      principal.userId,
      String(body.name ?? ''),
      Number(body.quantity ?? -1),
      String(body.unit ?? 'kg'),
      type,
      expiryTime,
      String(body.pickupAddress ?? ''),
      String(body.cityZone ?? ''),
      String(body.notes ?? ''),
      body,
    );

    res.status(201).json({
      donation: created.toMap(),
      message: `Donation '${created.name}' registered successfully.`,
    });
  });

  app.delete('/api/donations/:id', async (req, res, next) => {
    try {
      const principal = manager.requireSession(extractToken(req), UserRole.DONOR);
      const foodId = req.params.id.trim();
      await manager.cancelDonation(foodId, principal.userId);
      res.json({ message: `Donation ${foodId} cancelled.` });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/requests', async (req, res, next) => {
    try {
      const principal = manager.requireSession(extractToken(req), UserRole.NGO);
      const body = req.body ?? {};
      const foodId = String(body.foodId ?? '').trim();
      const qty = Number(body.quantity ?? -1);
      const created = await manager.requestFood(principal.userId, foodId, qty);
      res.status(201).json({
        request: created.toMap(),
        message: `Request ${created.id} submitted. Auto-allocating nearest volunteer.`,
      });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/requests', (req, res) => {
    const ngoId = typeof req.query.ngoId === 'string' ? req.query.ngoId : undefined;
    const volunteerId =
      typeof req.query.volunteerId === 'string' ? req.query.volunteerId : undefined;
    const donorId = typeof req.query.donorId === 'string' ? req.query.donorId : undefined;

    const list = manager.getRequestsFiltered(ngoId, volunteerId, donorId).map((r) => r.toMap());
    res.json({ requests: list });
  });

  app.post('/api/requests/:id/pickup', (req, res) => {
    const principal = manager.requireSession(extractToken(req), UserRole.VOLUNTEER);
    const updated = manager.markPickedUp(req.params.id.trim(), principal.userId);
    res.json({
      request: updated.toMap(),
      message: `Marked ${updated.id} as PICKED_UP.`,
    });
  });

  app.post('/api/requests/:id/deliver', async (req, res, next) => {
    try {
      const principal = manager.requireSession(extractToken(req), UserRole.VOLUNTEER);
      const updated = await manager.markDelivered(req.params.id.trim(), principal.userId);
      res.json({
        request: updated.toMap(),
        message: `Marked ${updated.id} as DELIVERED. You are now free for new tasks!`,
      });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/notifications', (req, res) => {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    res.json({ notifications: manager.getNotificationsForUser(userId) });
  });

  app.get('/api/dashboard', (req, res) => {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    const role = parseUserRole(typeof req.query.role === 'string' ? req.query.role : undefined);
    res.json({
      stats: manager.getDashboardStats(userId, role),
      userSummaries: manager.getAllUserSummaries(),
    });
  });

  app.get('/api/admin/overview', (_req, res) => {
    res.json({
      donations: manager.getAllDonationsSorted().map((f) => f.toMap()),
      requests: manager.getRequestsFiltered(null, null, null).map((r) => r.toMap()),
      volunteers: manager.getAllVolunteers().map((v) => v.toSummaryMap()),
      users: manager.getAllUserSummaries(),
      threadLogs: manager.getThreadActivityLogs(),
      stats: manager.getDashboardStats(null, UserRole.ADMIN),
    });
  });

  app.post('/api/admin/race-demo', async (_req, res, next) => {
    try {
      const result = await manager.runRaceConditionDemo();
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/admin/expiry-check', async (_req, res, next) => {
    try {
      const count = await manager.checkAndMarkExpiredFood();
      res.json({
        expiredCount: count,
        message: `Expiry scan complete. Newly expired items: ${count}`,
      });
    } catch (err) {
      next(err);
    }
  });

  app.use('/api', (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof DomainException) {
      res.status(err.statusCode).json({
        error: err.errorType,
        message: err.message,
        status: err.statusCode,
      });
      return;
    }
    const e = err as Error;
    res.status(500).json({
      error: 'ServerError',
      message: e?.message || 'Unexpected server error.',
      status: 500,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FoodBridge full-stack server running at http://localhost:${PORT}`);
  });
}

startServer();
