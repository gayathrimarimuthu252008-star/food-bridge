import { useCallback, useEffect, useState } from 'react';
import {
  DashboardStatsDTO,
  DonationRequestDTO,
  FoodItemDTO,
  NotificationDTO,
  RaceDemoResultDTO,
  UserRole,
  UserSummaryDTO,
} from './shared/types.ts';
import {
  AdminOverviewResponse,
  foodBridgeApi,
  getStoredToken,
  setStoredToken,
} from './lib/api.ts';
import { MarketplaceView } from './components/MarketplaceView.tsx';
import { AuthView } from './components/AuthView.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { AdminView } from './components/AdminView.tsx';
import { RequestModal } from './components/RequestModal.tsx';

type ViewName = 'home' | 'dashboard' | 'admin' | 'auth';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  const [view, setView] = useState<ViewName>('home');
  const [user, setUser] = useState<UserSummaryDTO | null>(null);
  const [zones, setZones] = useState<string[]>([
    'Chennai - T. Nagar',
    'Chennai - Adyar',
    'Chennai - Anna Nagar',
    'Chennai - Velachery',
    'Coimbatore - RS Puram',
    'Coimbatore - Gandhipuram',
    'Madurai - Meenakshi Temple',
    'Bengaluru - Indiranagar',
    'Bengaluru - Jayanagar',
    'Kochi - Ernakulam',
    'Hyderabad - Banjara Hills',
    'Mysuru - Gokulam',
  ]);
  const [demoUsers, setDemoUsers] = useState<UserSummaryDTO[]>([]);
  const [adminHint, setAdminHint] = useState<{ email: string; password: string } | null>(
    null,
  );

  const [stats, setStats] = useState<DashboardStatsDTO | null>(null);
  const [marketplace, setMarketplace] = useState<FoodItemDTO[]>([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [donorDonations, setDonorDonations] = useState<FoodItemDTO[]>([]);
  const [ngoAvailableFood, setNgoAvailableFood] = useState<FoodItemDTO[]>([]);
  const [requests, setRequests] = useState<DonationRequestDTO[]>([]);
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);

  const [adminOverview, setAdminOverview] = useState<AdminOverviewResponse | null>(null);
  const [raceDemoResult, setRaceDemoResult] = useState<RaceDemoResultDTO | null>(null);

  const [modalFood, setModalFood] = useState<FoodItemDTO | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  const loadStats = useCallback(async (activeUser: UserSummaryDTO | null) => {
    try {
      const data = await foodBridgeApi.getDashboard(activeUser?.id, activeUser?.role);
      setStats(data.stats);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadMarketplace = useCallback(async () => {
    try {
      const data = await foodBridgeApi.getDonations({
        availableOnly: true,
        q: searchQuery,
        type: typeFilter,
      });
      setMarketplace(data.donations);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setMarketplaceLoading(false);
    }
  }, [searchQuery, typeFilter, showToast]);

  const loadDashboardData = useCallback(
    async (activeUser: UserSummaryDTO | null) => {
      if (!activeUser || activeUser.role === UserRole.ADMIN) return;
      try {
        const notifRes = await foodBridgeApi.getNotifications(activeUser.id);
        setNotifications(notifRes.notifications);

        if (activeUser.role === UserRole.DONOR) {
          const donRes = await foodBridgeApi.getDonations({ donorId: activeUser.id });
          setDonorDonations(donRes.donations);
        } else if (activeUser.role === UserRole.NGO) {
          const [foodRes, reqRes] = await Promise.all([
            foodBridgeApi.getDonations({ availableOnly: true }),
            foodBridgeApi.getRequests({ ngoId: activeUser.id }),
          ]);
          setNgoAvailableFood(foodRes.donations);
          setRequests(reqRes.requests);
        } else if (activeUser.role === UserRole.VOLUNTEER) {
          const reqRes = await foodBridgeApi.getRequests({ volunteerId: activeUser.id });
          setRequests(reqRes.requests);
        }
      } catch (err) {
        showToast((err as Error).message, 'error');
      }
    },
    [showToast],
  );

  const loadAdminData = useCallback(async () => {
    try {
      const overview = await foodBridgeApi.getAdminOverview();
      setAdminOverview(overview);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  }, [showToast]);

  const refreshActiveView = useCallback(
    async (activeUser: UserSummaryDTO | null, activeView: ViewName) => {
      await loadStats(activeUser);
      if (activeView === 'home') await loadMarketplace();
      if (activeView === 'dashboard') await loadDashboardData(activeUser);
      if (activeView === 'admin') await loadAdminData();
    },
    [loadStats, loadMarketplace, loadDashboardData, loadAdminData],
  );

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      let restoredUser: UserSummaryDTO | null = null;
      if (getStoredToken()) {
        try {
          const me = await foodBridgeApi.me();
          restoredUser = me.user;
        } catch {
          setStoredToken(null);
        }
      }

      try {
        const demo = await foodBridgeApi.getDemoUsers();
        if (mounted) {
          setDemoUsers(demo.users);
          setAdminHint(demo.adminHint);
          if (demo.zones.length > 0) setZones(demo.zones);
        }
      } catch (err) {
        console.error(err);
      }

      if (mounted) {
        setUser(restoredUser);
        await refreshActiveView(restoredUser, 'home');
      }
    };
    void bootstrap();
    return () => {
      mounted = false;
    };
  }, [refreshActiveView]);

  useEffect(() => {
    void refreshActiveView(user, view);
  }, [view, user, refreshActiveView]);

  useEffect(() => {
    const timer = setInterval(() => {
      void refreshActiveView(user, view);
    }, 4000);
    return () => clearInterval(timer);
  }, [user, view, refreshActiveView]);

  const handleLogin = async (email: string, password: string) => {
    try {
      const res = await foodBridgeApi.login(email, password);
      setStoredToken(res.token);
      setUser(res.user);
      showToast(`Signed in as ${res.user.name}`, 'success');
      setView(res.user.role === UserRole.ADMIN ? 'admin' : 'dashboard');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleRegister = async (payload: Record<string, unknown>) => {
    try {
      const res = await foodBridgeApi.register(payload);
      setStoredToken(res.token);
      setUser(res.user);
      const demo = await foodBridgeApi.getDemoUsers();
      setDemoUsers(demo.users);
      showToast(`Account created! Welcome ${res.user.name}`, 'success');
      setView('dashboard');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await foodBridgeApi.logout();
    } catch {
      // ignore logout error
    }
    setStoredToken(null);
    setUser(null);
    showToast('Signed out', 'info');
    setView('home');
  };

  const handleCreateDonation = async (payload: Record<string, unknown>) => {
    try {
      const res = await foodBridgeApi.createDonation(payload);
      showToast(res.message, 'success');
      await refreshActiveView(user, view);
    } catch (err) {
      showToast((err as Error).message, 'error');
      throw err;
    }
  };

  const handleCancelDonation = async (foodId: string) => {
    try {
      const res = await foodBridgeApi.cancelDonation(foodId);
      showToast(res.message, 'success');
      await refreshActiveView(user, view);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleConfirmRequest = async (foodId: string, quantity: number) => {
    try {
      const res = await foodBridgeApi.createRequest(foodId, quantity);
      setModalFood(null);
      showToast(res.message, 'success');
      await refreshActiveView(user, view);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleMarkPickedUp = async (reqId: string) => {
    try {
      const res = await foodBridgeApi.markPickedUp(reqId);
      showToast(res.message, 'success');
      await refreshActiveView(user, view);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleMarkDelivered = async (reqId: string) => {
    try {
      const res = await foodBridgeApi.markDelivered(reqId);
      showToast(res.message, 'success');
      await refreshActiveView(user, view);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleRunExpiryScan = async () => {
    try {
      const res = await foodBridgeApi.runExpiryCheck();
      showToast(res.message, 'info');
      await refreshActiveView(user, view);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleRunRaceDemo = async () => {
    try {
      const res = await foodBridgeApi.runRaceDemo();
      setRaceDemoResult(res);
      showToast(
        `Race Demo complete: ${res.successCount} succeeded, ${res.failureCount} blocked`,
        'success',
      );
      await refreshActiveView(user, view);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const showDashboardTab = Boolean(user && user.role !== UserRole.ADMIN);

  return (
    <div className="min-h-screen bg-[#FAF3E0] text-[#3E2C1C]">
      {/* Top Navigation Bar: 3-Zone Contract with gentle cream-to-peach gradient and kolam border */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-[#FAF3E0] via-[#FFFDF5] to-[#FDEEE2]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-3.5">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => setView('home')}
            className="text-lg font-bold tracking-tight text-[#2F6F73] whitespace-nowrap shrink-0"
          >
            FoodBridge
          </button>

          {/* Zone 2: Clean Single-Line Text Nav Links */}
          <nav className="flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setView('home')}
              className={`border-b-2 pb-0.5 transition-colors whitespace-nowrap shrink-0 ${
                view === 'home'
                  ? 'border-[#2F6F73] text-[#2F6F73]'
                  : 'border-transparent text-[#6E5843] hover:text-[#3E2C1C]'
              }`}
            >
              Marketplace
            </button>

            {showDashboardTab && (
              <button
                type="button"
                onClick={() => setView('dashboard')}
                className={`border-b-2 pb-0.5 transition-colors whitespace-nowrap shrink-0 ${
                  view === 'dashboard'
                    ? 'border-[#2F6F73] text-[#2F6F73]'
                    : 'border-transparent text-[#6E5843] hover:text-[#3E2C1C]'
                }`}
              >
                My Dashboard
              </button>
            )}

            <button
              type="button"
              onClick={() => setView('admin')}
              className={`border-b-2 pb-0.5 transition-colors whitespace-nowrap shrink-0 ${
                view === 'admin'
                  ? 'border-[#2F6F73] text-[#2F6F73]'
                  : 'border-transparent text-[#6E5843] hover:text-[#3E2C1C]'
              }`}
            >
              Admin Overview
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-4 shrink-0">
            {user ? (
              <>
                <span className="hidden text-xs font-medium text-[#6E5843] sm:inline whitespace-nowrap">
                  {user.name} · {user.roleLabel}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg border border-[#DECFAF] bg-[#FFFDF5] px-4 py-2 text-xs font-medium text-[#3E2C1C] hover:bg-[#F5EBD6] whitespace-nowrap shrink-0"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setView('auth')}
                className="rounded-lg bg-[#2F6F73] px-4 py-2 text-xs font-medium text-white hover:bg-[#25585C] whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Delicate Kolam-inspired geometric border line */}
        <div
          aria-hidden="true"
          className="h-2 w-full border-b border-[#E5D7BE] opacity-85"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2728%27 height=%278%27 viewBox=%270 0 28 8%27%3E%3Cpath d=%27M0 4 L7 1 L14 4 L7 7 Z%27 fill=%27none%27 stroke=%27%232F6F73%27 stroke-width=%270.85%27 opacity=%270.55%27/%3E%3Ccircle cx=%277%27 cy=%274%27 r=%271%27 fill=%27%23C8694A%27 opacity=%270.7%27/%3E%3Cpath d=%27M14 4 L21 1 L28 4 L21 7 Z%27 fill=%27none%27 stroke=%27%23D9A441%27 stroke-width=%270.85%27 opacity=%270.75%27/%3E%3Ccircle cx=%2721%27 cy=%274%27 r=%271%27 fill=%27%232F6F73%27 opacity=%270.65%27/%3E%3C/svg%3E")',
            backgroundRepeat: 'repeat-x',
          }}
        />
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Global KPI Strip with colored top borders */}
        <section
          aria-label="Live System Metrics"
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
        >
          <div className="rounded-xl border border-[#E5D7BE] border-t-[3px] border-t-[#4F5D95] bg-[#FFFDF5] px-4 py-3.5">
            <div className="text-xs font-medium text-[#6E5843]">Total Donated</div>
            <div className="mt-1 font-mono-tabular text-2xl font-semibold text-[#4F5D95]">
              {stats?.totalDonated ?? 0}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5D7BE] border-t-[3px] border-t-[#5E8C5A] bg-[#FFFDF5] px-4 py-3.5">
            <div className="text-xs font-medium text-[#6E5843]">Available Now</div>
            <div className="mt-1 font-mono-tabular text-2xl font-semibold text-[#5E8C5A]">
              {stats?.availableCount ?? 0}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5D7BE] border-t-[3px] border-t-[#2F6F73] bg-[#FFFDF5] px-4 py-3.5">
            <div className="text-xs font-medium text-[#6E5843]">Delivered</div>
            <div className="mt-1 font-mono-tabular text-2xl font-semibold text-[#2F6F73]">
              {stats?.totalDelivered ?? 0}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5D7BE] border-t-[3px] border-t-[#C8694A] bg-[#FFFDF5] px-4 py-3.5">
            <div className="text-xs font-medium text-[#6E5843]">Expired</div>
            <div className="mt-1 font-mono-tabular text-2xl font-semibold text-[#C8694A]">
              {stats?.totalExpired ?? 0}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5D7BE] border-t-[3px] border-t-[#D9A441] bg-[#FFFDF5] px-4 py-3.5">
            <div className="text-xs font-medium text-[#6E5843]">Active Requests</div>
            <div className="mt-1 font-mono-tabular text-2xl font-semibold text-[#9B6D16]">
              {stats?.activeRequests ?? 0}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5D7BE] border-t-[3px] border-t-[#2F6F73] bg-[#FFFDF5] px-4 py-3.5">
            <div className="text-xs font-medium text-[#6E5843]">Free Volunteers</div>
            <div className="mt-1 font-mono-tabular text-2xl font-semibold text-[#3E2C1C]">
              {stats ? `${stats.freeVolunteers}/${stats.totalVolunteers}` : '0/0'}
            </div>
          </div>
        </section>

        {view === 'home' && (
          <MarketplaceView
            donations={marketplace}
            loading={marketplaceLoading}
            searchQuery={searchQuery}
            typeFilter={typeFilter}
            currentUser={user}
            onSearchChange={setSearchQuery}
            onTypeFilterChange={setTypeFilter}
            onRefresh={loadMarketplace}
            onOpenRequest={setModalFood}
            onNavigateAuth={() => setView('auth')}
          />
        )}

        {view === 'auth' && (
          <AuthView
            demoUsers={demoUsers}
            adminHint={adminHint}
            zones={zones}
            onLogin={handleLogin}
            onRegister={handleRegister}
          />
        )}

        {view === 'dashboard' && user && user.role !== UserRole.ADMIN && (
          <DashboardView
            user={user}
            zones={zones}
            donorDonations={donorDonations}
            ngoAvailableFood={ngoAvailableFood}
            requests={requests}
            notifications={notifications}
            onCreateDonation={handleCreateDonation}
            onCancelDonation={handleCancelDonation}
            onOpenRequestModal={setModalFood}
            onMarkPickedUp={handleMarkPickedUp}
            onMarkDelivered={handleMarkDelivered}
          />
        )}

        {view === 'admin' && (
          <AdminView
            overview={adminOverview}
            raceDemoResult={raceDemoResult}
            onRunExpiryScan={handleRunExpiryScan}
            onRunRaceDemo={handleRunRaceDemo}
          />
        )}
      </main>

      <RequestModal
        food={modalFood}
        onClose={() => setModalFood(null)}
        onConfirm={handleConfirmRequest}
      />

      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex flex-col gap-2"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`max-w-sm rounded-lg px-4 py-3 text-sm font-medium text-white shadow-md ${
                t.type === 'success'
                  ? 'bg-[#5E8C5A]'
                  : t.type === 'error'
                    ? 'bg-[#C8694A]'
                    : 'bg-[#2F6F73]'
              }`}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
