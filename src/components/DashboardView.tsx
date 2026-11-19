import React, { useEffect, useState } from 'react';
import {
  DonationRequestDTO,
  DonationStatus,
  FoodItemDTO,
  FoodType,
  NotificationDTO,
  UserRole,
  UserSummaryDTO,
} from '../shared/types.ts';
import {
  formatExpiryCountdown,
  getFoodTypeChipClass,
  getStatusTextClass,
  getUrgencyMeta,
} from './formatters.ts';

interface DashboardViewProps {
  user: UserSummaryDTO;
  zones: string[];
  donorDonations: FoodItemDTO[];
  ngoAvailableFood: FoodItemDTO[];
  requests: DonationRequestDTO[];
  notifications: NotificationDTO[];
  onCreateDonation: (payload: Record<string, unknown>) => Promise<void>;
  onCancelDonation: (foodId: string) => Promise<void>;
  onOpenRequestModal: (food: FoodItemDTO) => void;
  onMarkPickedUp: (reqId: string) => Promise<void>;
  onMarkDelivered: (reqId: string) => Promise<void>;
}

interface QuickAddPreset {
  id: string;
  label: string;
  name: string;
  foodType: FoodType;
  quantity: number;
  unit: string;
  expiryMinutes: number;
  safeHours: number;
  vegetarian?: boolean;
  servingTemp?: string;
  batchCode?: string;
  requiresRefrigeration?: boolean;
  notes?: string;
}

const QUICK_ADD_PRESETS: QuickAddPreset[] = [
  { id: 'curd_rice', label: 'Curd Rice (Cooked · 2h rule)', name: 'Curd Rice', foodType: FoodType.COOKED, quantity: 15, unit: 'kg', expiryMinutes: 45, safeHours: 2, vegetarian: true, servingTemp: 'Chilled', notes: 'Tempered thayir sadam' },
  { id: 'idli_vada', label: 'Soft Idli & Medu Vada (Cooked · 4h rule)', name: 'Soft Idli & Medu Vada', foodType: FoodType.COOKED, quantity: 120, unit: 'pieces', expiryMinutes: 60, safeHours: 4, vegetarian: true, servingTemp: 'Hot', notes: 'Packed in thermal crates' },
  { id: 'dosa', label: 'Crispy Masala Dosa & Chutney Boxes (Cooked)', name: 'Crispy Masala Dosa & Chutney Boxes', foodType: FoodType.COOKED, quantity: 50, unit: 'boxes', expiryMinutes: 90, safeHours: 4, vegetarian: true, servingTemp: 'Hot' },
  { id: 'pongal', label: 'Ven Pongal & Sambar (Cooked · 4h rule)', name: 'Ven Pongal & Sambar', foodType: FoodType.COOKED, quantity: 20, unit: 'kg', expiryMinutes: 90, safeHours: 4, vegetarian: true, servingTemp: 'Hot' },
  { id: 'sambar_rice', label: 'Sambar Rice (Cooked · 4h rule)', name: 'Sambar Rice', foodType: FoodType.COOKED, quantity: 25, unit: 'kg', expiryMinutes: 120, safeHours: 4, vegetarian: true, servingTemp: 'Hot' },
  { id: 'lemon_rice', label: 'Lemon Rice (Cooked · 4h rule)', name: 'Lemon Rice', foodType: FoodType.COOKED, quantity: 20, unit: 'kg', expiryMinutes: 150, safeHours: 4, vegetarian: true, servingTemp: 'Warm' },
  { id: 'puliyogare', label: 'Tamarind Rice / Puliyogare (Cooked · 6h rule)', name: 'Tamarind Rice (Puliyogare)', foodType: FoodType.COOKED, quantity: 25, unit: 'kg', expiryMinutes: 240, safeHours: 6, vegetarian: true, servingTemp: 'Warm' },
  { id: 'bisi_bele', label: 'Bisi Bele Bath (Cooked · 4h rule)', name: 'Bisi Bele Bath', foodType: FoodType.COOKED, quantity: 25, unit: 'kg', expiryMinutes: 150, safeHours: 4, vegetarian: true, servingTemp: 'Hot' },
  { id: 'veg_biryani', label: 'Vegetable Biryani (Cooked · 4h rule)', name: 'Vegetable Biryani', foodType: FoodType.COOKED, quantity: 30, unit: 'kg', expiryMinutes: 180, safeHours: 4, vegetarian: true, servingTemp: 'Hot' },
  { id: 'hyd_biryani', label: 'Hyderabadi Biryani (Cooked · 4h rule)', name: 'Hyderabadi Biryani', foodType: FoodType.COOKED, quantity: 35, unit: 'kg', expiryMinutes: 180, safeHours: 4, vegetarian: false, servingTemp: 'Hot' },
  { id: 'parotta', label: 'Parotta with Vegetable Kurma (Cooked)', name: 'Parotta with Vegetable Kurma', foodType: FoodType.COOKED, quantity: 40, unit: 'packs', expiryMinutes: 150, safeHours: 4, vegetarian: true, servingTemp: 'Hot' },
  { id: 'chapati', label: 'Chapati with Kurma (Cooked)', name: 'Chapati with Kurma', foodType: FoodType.COOKED, quantity: 45, unit: 'packs', expiryMinutes: 180, safeHours: 4, vegetarian: true, servingTemp: 'Warm' },
  { id: 'appam', label: 'Appam with Vegetable Stew (Cooked)', name: 'Appam with Vegetable Stew', foodType: FoodType.COOKED, quantity: 30, unit: 'packs', expiryMinutes: 150, safeHours: 4, vegetarian: true, servingTemp: 'Warm' },
  { id: 'puttu', label: 'Puttu with Kadala Curry (Cooked)', name: 'Puttu with Kadala Curry', foodType: FoodType.COOKED, quantity: 30, unit: 'packs', expiryMinutes: 180, safeHours: 4, vegetarian: true, servingTemp: 'Hot' },
  { id: 'upma', label: 'Rava Upma (Cooked · 4h rule)', name: 'Rava Upma', foodType: FoodType.COOKED, quantity: 15, unit: 'kg', expiryMinutes: 120, safeHours: 4, vegetarian: true, servingTemp: 'Hot' },
  { id: 'kesari', label: 'Rava Kesari (Cooked · 4h rule)', name: 'Rava Kesari', foodType: FoodType.COOKED, quantity: 12, unit: 'kg', expiryMinutes: 240, safeHours: 4, vegetarian: true, servingTemp: 'Warm' },
  { id: 'payasam', label: 'Semiya Payasam (Cooked · 2h rule)', name: 'Semiya Payasam', foodType: FoodType.COOKED, quantity: 15, unit: 'L', expiryMinutes: 60, safeHours: 2, vegetarian: true, servingTemp: 'Warm' },
  { id: 'sadya', label: 'Kerala Sadya Meal Packs (Cooked)', name: 'Kerala Sadya Meal Packs', foodType: FoodType.COOKED, quantity: 60, unit: 'packs', expiryMinutes: 180, safeHours: 4, vegetarian: true, servingTemp: 'Warm' },
  { id: 'meal_boxes', label: 'Cooked Meal Boxes (Cooked · 4h rule)', name: 'Cooked Meal Boxes', foodType: FoodType.COOKED, quantity: 50, unit: 'boxes', expiryMinutes: 180, safeHours: 4, vegetarian: true, servingTemp: 'Warm' },
  { id: 'coffee', label: 'Filter Coffee Flasks (Cooked · 4h rule)', name: 'Filter Coffee Flasks', foodType: FoodType.COOKED, quantity: 10, unit: 'flasks', expiryMinutes: 180, safeHours: 4, vegetarian: true, servingTemp: 'Hot' },
  { id: 'buttermilk', label: 'Spiced Buttermilk / Neer Mor (Cooked · 2h rule)', name: 'Spiced Buttermilk (Neer Mor)', foodType: FoodType.COOKED, quantity: 20, unit: 'L', expiryMinutes: 50, safeHours: 2, vegetarian: true, servingTemp: 'Chilled' },
  { id: 'chutney_sambar', label: 'Coconut Chutney & Sambar Packs (Cooked · 2h rule)', name: 'Coconut Chutney & Sambar Packs', foodType: FoodType.COOKED, quantity: 40, unit: 'packs', expiryMinutes: 55, safeHours: 2, vegetarian: true, servingTemp: 'Chilled' },
  { id: 'mysore_pak', label: 'Mysore Pak Boxes (Packaged · 72h rule)', name: 'Mysore Pak Boxes', foodType: FoodType.PACKAGED, quantity: 30, unit: 'boxes', expiryMinutes: 2160, safeHours: 72, batchCode: 'MYS-881' },
  { id: 'banana_chips', label: 'Kerala Banana Chips (Packaged · 168h rule)', name: 'Kerala Banana Chips', foodType: FoodType.PACKAGED, quantity: 50, unit: 'packs', expiryMinutes: 4320, safeHours: 168, batchCode: 'KBC-309' },
  { id: 'murukku', label: 'Traditional Murukku Packs (Packaged · 168h rule)', name: 'Traditional Murukku Packs', foodType: FoodType.PACKAGED, quantity: 60, unit: 'packs', expiryMinutes: 5760, safeHours: 168, batchCode: 'MRK-772' },
  { id: 'bread_buns', label: 'Bread & Buns (Packaged · 24h rule)', name: 'Bread & Buns', foodType: FoodType.PACKAGED, quantity: 40, unit: 'packs', expiryMinutes: 960, safeHours: 24, batchCode: 'BAK-224' },
  { id: 'milk_packets', label: 'Toned Milk Packets (Packaged · 12h rule)', name: 'Toned Milk Packets', foodType: FoodType.PACKAGED, quantity: 60, unit: 'L', expiryMinutes: 480, safeHours: 12, batchCode: 'AAVIN-500' },
  { id: 'biscuits_snacks', label: 'Biscuits & Packaged Snacks (Packaged · 120h rule)', name: 'Biscuits & Packaged Snacks', foodType: FoodType.PACKAGED, quantity: 70, unit: 'packs', expiryMinutes: 2880, safeHours: 120, batchCode: 'SNK-410' },
  { id: 'water_juice', label: 'Bottled Water & Fruit Juice (Packaged · 720h rule)', name: 'Bottled Water & Fruit Juice', foodType: FoodType.PACKAGED, quantity: 100, unit: 'bottles', expiryMinutes: 8640, safeHours: 720, batchCode: 'BEV-905' },
  { id: 'rice_bags', label: 'Sona Masoori & Ponni Rice Bags (Raw · 720h rule)', name: 'Sona Masoori & Ponni Rice Bags', foodType: FoodType.RAW_INGREDIENTS, quantity: 100, unit: 'kg', expiryMinutes: 14400, safeHours: 720, requiresRefrigeration: false },
  { id: 'dal_flour', label: 'Toor Dal & Wheat Flour (Raw · 336h rule)', name: 'Toor Dal & Wheat Flour', foodType: FoodType.RAW_INGREDIENTS, quantity: 50, unit: 'kg', expiryMinutes: 10080, safeHours: 336, requiresRefrigeration: false },
  { id: 'veg_fruits', label: 'Fresh Vegetables & Fruits (Raw · 48h rule)', name: 'Fresh Vegetables & Fruits', foodType: FoodType.RAW_INGREDIENTS, quantity: 45, unit: 'kg', expiryMinutes: 1800, safeHours: 48, requiresRefrigeration: false },
];

function defaultExpiryLocal(minutesAhead: number): string {
  const dt = new Date(Date.now() + minutesAhead * 60_000);
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  zones,
  donorDonations,
  ngoAvailableFood,
  requests,
  notifications,
  onCreateDonation,
  onCancelDonation,
  onOpenRequestModal,
  onMarkPickedUp,
  onMarkDelivered,
}) => {
  const [quickAddId, setQuickAddId] = useState('');
  const [foodName, setFoodName] = useState('');
  const [foodType, setFoodType] = useState<FoodType>(FoodType.COOKED);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [expiryTime, setExpiryTime] = useState(() => defaultExpiryLocal(120));
  const [cityZone, setCityZone] = useState(user.cityZone || zones[0] || 'Chennai - T. Nagar');
  const [pickupAddress, setPickupAddress] = useState(user.address || '');
  const [notes, setNotes] = useState('');
  const [vegetarian, setVegetarian] = useState(true);
  const [servingTemp, setServingTemp] = useState('Hot');
  const [sealIntact, setSealIntact] = useState(true);
  const [batchCode, setBatchCode] = useState('BATCH-101');
  const [requiresRefrigeration, setRequiresRefrigeration] = useState(false);
  const [safeHoursOverride, setSafeHoursOverride] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCityZone(user.cityZone || zones[0] || 'Chennai - T. Nagar');
    setPickupAddress(user.address || '');
  }, [user.id, user.cityZone, user.address, zones]);

  const handleQuickAddSelect = (presetId: string) => {
    setQuickAddId(presetId);
    if (!presetId) {
      setSafeHoursOverride(undefined);
      return;
    }
    const preset = QUICK_ADD_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setFoodName(preset.name);
    setFoodType(preset.foodType);
    setQuantity(String(preset.quantity));
    setUnit(preset.unit);
    setExpiryTime(defaultExpiryLocal(preset.expiryMinutes));
    setSafeHoursOverride(preset.safeHours);
    if (preset.vegetarian !== undefined) setVegetarian(preset.vegetarian);
    if (preset.servingTemp) setServingTemp(preset.servingTemp);
    if (preset.batchCode) setBatchCode(preset.batchCode);
    if (preset.requiresRefrigeration !== undefined) {
      setRequiresRefrigeration(preset.requiresRefrigeration);
    }
    if (preset.notes) setNotes(preset.notes);
  };

  const handleAddDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreateDonation({
        name: foodName.trim(),
        foodType,
        quantity: Number(quantity),
        unit: unit.trim(),
        expiryTime,
        cityZone,
        pickupAddress: pickupAddress.trim(),
        notes: notes.trim(),
        vegetarian,
        servingTemp,
        sealIntact,
        batchCode,
        requiresRefrigeration,
        safeHours: safeHoursOverride,
      });
      setQuickAddId('');
      setFoodName('');
      setQuantity('');
      setNotes('');
      setSafeHoursOverride(undefined);
      setExpiryTime(defaultExpiryLocal(120));
    } finally {
      setSubmitting(false);
    }
  };

  const bannerStyle =
    user.role === UserRole.DONOR
      ? 'border-[#E7C6B9] border-t-[3px] border-t-[#C8694A] bg-gradient-to-r from-[#FFFDF5] to-[#FBF0EB]'
      : user.role === UserRole.NGO
        ? 'border-[#C8DBC6] border-t-[3px] border-t-[#5E8C5A] bg-gradient-to-r from-[#FFFDF5] to-[#EFF5EE]'
        : 'border-[#C9CFE6] border-t-[3px] border-t-[#4F5D95] bg-gradient-to-r from-[#FFFDF5] to-[#EFF1F8]';

  return (
    <section aria-label="Role Dashboard" className="space-y-6">
      <div className={`flex flex-col justify-between gap-3 rounded-xl border p-6 sm:flex-row sm:items-center ${bannerStyle}`}>
        <div>
          <p className="text-xs font-medium text-[#6E5843]">
            {user.roleLabel} Workspace · {user.id}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[#3E2C1C]">
            Welcome, {user.name}
          </h2>
          <p className="mt-1 text-sm text-[#5A4532]">{user.dashboardInfo}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {user.role === UserRole.DONOR && (
            <>
              <div className="rounded-xl border border-[#E5D7BE] border-t-[3px] border-t-[#C8694A] bg-[#FFFDF5] p-6">
                <div className="border-b border-[#EFE5D0] pb-3">
                  <h3 className="text-lg font-semibold text-[#3E2C1C]">
                    Publish Surplus Food Donation
                  </h3>
                  <p className="mt-0.5 text-sm text-[#6E5843]">
                    Choose a common South Indian or staple preset below, or type any custom food item.
                  </p>
                </div>

                <form onSubmit={handleAddDonation} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="don-quick-add" className="block text-sm font-medium text-[#2F6F73]">
                      Quick Add Common Item (Optional Preset)
                    </label>
                    <select
                      id="don-quick-add"
                      value={quickAddId}
                      onChange={(e) => handleQuickAddSelect(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[#C5D8D9] bg-[#F2F8F8] px-3 py-2 text-sm text-[#3E2C1C] focus:border-[#2F6F73] focus:outline-none"
                    >
                      <option value="">-- Select a common item to prefill (or enter custom below) --</option>
                      {QUICK_ADD_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="don-name" className="block text-sm font-medium text-[#3E2C1C]">
                      Food Name
                    </label>
                    <input
                      id="don-name"
                      type="text"
                      required
                      value={foodName}
                      onChange={(e) => {
                        setFoodName(e.target.value);
                        setSafeHoursOverride(undefined);
                      }}
                      placeholder="e.g. Sambar Rice or Soft Idli & Medu Vada"
                      className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] focus:border-[#2F6F73] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="don-type" className="block text-sm font-medium text-[#3E2C1C]">
                      Food Type
                    </label>
                    <select
                      id="don-type"
                      value={foodType}
                      onChange={(e) => setFoodType(e.target.value as FoodType)}
                      className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] focus:border-[#2F6F73] focus:outline-none"
                    >
                      <option value={FoodType.COOKED}>Cooked Food (2–6h rule)</option>
                      <option value={FoodType.PACKAGED}>Packaged Food (12–720h rule)</option>
                      <option value={FoodType.RAW_INGREDIENTS}>Raw Ingredients (48–720h rule)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="don-qty" className="block text-sm font-medium text-[#3E2C1C]">
                      Quantity
                    </label>
                    <input
                      id="don-qty"
                      type="number"
                      required
                      min="0.5"
                      step="0.5"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="20"
                      className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] tabular-nums focus:border-[#2F6F73] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="don-unit" className="block text-sm font-medium text-[#3E2C1C]">
                      Unit
                    </label>
                    <input
                      id="don-unit"
                      type="text"
                      required
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="kg / packs / boxes / pieces"
                      className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] focus:border-[#2F6F73] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="don-expiry" className="block text-sm font-medium text-[#3E2C1C]">
                      Expiry Date &amp; Time
                    </label>
                    <input
                      id="don-expiry"
                      type="datetime-local"
                      required
                      value={expiryTime}
                      onChange={(e) => setExpiryTime(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] font-mono-tabular focus:border-[#2F6F73] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="don-zone" className="block text-sm font-medium text-[#3E2C1C]">
                      City Zone
                    </label>
                    <select
                      id="don-zone"
                      value={cityZone}
                      onChange={(e) => setCityZone(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] focus:border-[#2F6F73] focus:outline-none"
                    >
                      {zones.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </div>

                  {foodType === FoodType.COOKED && (
                    <>
                      <div>
                        <label htmlFor="don-temp" className="block text-sm font-medium text-[#3E2C1C]">
                          Serving Temperature
                        </label>
                        <select
                          id="don-temp"
                          value={servingTemp}
                          onChange={(e) => setServingTemp(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C]"
                        >
                          <option value="Hot">Hot</option>
                          <option value="Warm">Warm</option>
                          <option value="Chilled">Chilled</option>
                        </select>
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="inline-flex items-center gap-2 text-sm text-[#3E2C1C]">
                          <input
                            type="checkbox"
                            checked={vegetarian}
                            onChange={(e) => setVegetarian(e.target.checked)}
                            className="h-4 w-4 rounded border-[#DECFAF] text-[#2F6F73]"
                          />
                          Vegetarian Dish
                        </label>
                      </div>
                    </>
                  )}

                  {foodType === FoodType.PACKAGED && (
                    <>
                      <div>
                        <label htmlFor="don-batch" className="block text-sm font-medium text-[#3E2C1C]">
                          Batch Code
                        </label>
                        <input
                          id="don-batch"
                          type="text"
                          value={batchCode}
                          onChange={(e) => setBatchCode(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] font-mono-tabular"
                        />
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="inline-flex items-center gap-2 text-sm text-[#3E2C1C]">
                          <input
                            type="checkbox"
                            checked={sealIntact}
                            onChange={(e) => setSealIntact(e.target.checked)}
                            className="h-4 w-4 rounded border-[#DECFAF] text-[#2F6F73]"
                          />
                          Factory Seal Intact
                        </label>
                      </div>
                    </>
                  )}

                  {foodType === FoodType.RAW_INGREDIENTS && (
                    <div className="sm:col-span-2">
                      <label className="inline-flex items-center gap-2 text-sm text-[#3E2C1C]">
                        <input
                          type="checkbox"
                          checked={requiresRefrigeration}
                          onChange={(e) => setRequiresRefrigeration(e.target.checked)}
                          className="h-4 w-4 rounded border-[#DECFAF] text-[#2F6F73]"
                        />
                        Requires Refrigeration (72h cold-chain rule)
                      </label>
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <label htmlFor="don-address" className="block text-sm font-medium text-[#3E2C1C]">
                      Pickup Address
                    </label>
                    <input
                      id="don-address"
                      type="text"
                      required
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] focus:border-[#2F6F73] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="don-notes" className="block text-sm font-medium text-[#3E2C1C]">
                      Handling Notes (optional)
                    </label>
                    <input
                      id="don-notes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Thermal container, allergen, or serving instructions"
                      className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] focus:border-[#2F6F73] focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 sm:col-span-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[#6E5843]">Quick Expiry:</span>
                      {[
                        { mins: 45, label: '+45m (Critical)' },
                        { mins: 120, label: '+2h (Soon)' },
                        { mins: 360, label: '+6h (Safe)' },
                      ].map((preset) => (
                        <button
                          key={preset.mins}
                          type="button"
                          onClick={() => setExpiryTime(defaultExpiryLocal(preset.mins))}
                          className="rounded-md border border-[#DECFAF] bg-[#FAF3E0] px-2.5 py-1 text-xs font-medium text-[#3E2C1C] hover:bg-[#F3E7CB] whitespace-nowrap"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-lg bg-[#2F6F73] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#25585C] disabled:opacity-60 whitespace-nowrap"
                    >
                      {submitting ? 'Publishing...' : 'Publish Donation'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-xl border border-[#E5D7BE] border-t-[3px] border-t-[#D9A441] bg-[#FFFDF5] p-6">
                <h3 className="text-lg font-semibold text-[#3E2C1C]">
                  My Donations &amp; Live Status
                </h3>
                {donorDonations.length === 0 ? (
                  <p className="mt-4 text-sm text-[#6E5843]">
                    You have not published any donations yet.
                  </p>
                ) : (
                  <div className="mt-4 divide-y divide-[#F4ECDC]">
                    {donorDonations.map((f) => (
                      <div
                        key={f.id}
                        className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-[#3E2C1C]">{f.name}</span>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${getFoodTypeChipClass(
                                f.foodType,
                              )}`}
                            >
                              {f.foodTypeLabel}
                            </span>
                            <span className="font-mono-tabular text-xs text-[#6E5843]">
                              {f.availableQuantity}/{f.initialQuantity} {f.unit}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-[#6E5843]">
                            {f.id} · Safe {f.safeHours}h rule ·{' '}
                            <span className="font-mono-tabular text-[#4F5D95]">
                              {formatExpiryCountdown(f.expiryTime, f.minutesRemaining)}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs ${getStatusTextClass(f.status)}`}>
                            {f.statusLabel}
                          </span>
                          {f.status === DonationStatus.AVAILABLE && (
                            <button
                              type="button"
                              onClick={() => onCancelDonation(f.id)}
                              className="rounded-md border border-[#E7C6B9] bg-[#FCEEE9] px-3 py-1.5 text-xs font-medium text-[#A84A2F] hover:bg-[#F7DDD4] whitespace-nowrap"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {user.role === UserRole.NGO && (
            <>
              <div className="rounded-xl border border-[#E5D7BE] border-t-[3px] border-t-[#5E8C5A] bg-[#FFFDF5] p-6">
                <h3 className="text-lg font-semibold text-[#3E2C1C]">
                  Available Donations to Request
                </h3>
                <p className="mt-0.5 text-sm text-[#6E5843]">
                  Partial quantities are supported. Nearest free volunteer is assigned automatically.
                </p>

                {ngoAvailableFood.length === 0 ? (
                  <p className="mt-4 text-sm text-[#6E5843]">
                    No available food donations at the moment.
                  </p>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {ngoAvailableFood.map((f) => {
                      const urgency = getUrgencyMeta(f.urgencyLevel);
                      return (
                        <div
                          key={f.id}
                          className={`flex flex-col justify-between overflow-hidden rounded-lg border border-[#E5D7BE] bg-white p-4 ${urgency.topBorderClass}`}
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs">
                              <span className={urgency.textClass}>{urgency.label}</span>
                              <span className="font-mono-tabular text-[#6E5843]">{f.cityZone}</span>
                            </div>
                            <div className="mt-2 flex items-start justify-between gap-2">
                              <h4 className="font-semibold text-[#3E2C1C]">{f.name}</h4>
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${getFoodTypeChipClass(
                                  f.foodType,
                                )}`}
                              >
                                {f.foodTypeLabel}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-[#5A4532]">
                              <span className="font-mono-tabular font-semibold text-[#3E2C1C]">
                                {f.availableQuantity} {f.unit}
                              </span>{' '}
                              remaining · {f.donorName}
                            </p>
                            <p className="mt-1 font-mono-tabular text-xs text-[#4F5D95]">
                              {formatExpiryCountdown(f.expiryTime, f.minutesRemaining)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpenRequestModal(f)}
                            className="mt-3 w-full rounded-lg bg-[#2F6F73] px-3 py-2 text-xs font-medium text-white hover:bg-[#25585C]"
                          >
                            Request Food
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[#E5D7BE] border-t-[3px] border-t-[#D9A441] bg-[#FFFDF5] p-6">
                <h3 className="text-lg font-semibold text-[#3E2C1C]">
                  My Request History &amp; Delivery Tracking
                </h3>
                {requests.length === 0 ? (
                  <p className="mt-4 text-sm text-[#6E5843]">
                    You have not submitted any food requests yet.
                  </p>
                ) : (
                  <div className="mt-4 divide-y divide-[#F4ECDC]">
                    {requests.map((r) => (
                      <div
                        key={r.id}
                        className="flex flex-col justify-between gap-2 py-3.5 sm:flex-row sm:items-center"
                      >
                        <div>
                          <p className="text-sm font-medium text-[#3E2C1C]">
                            {r.foodName} ·{' '}
                            <span className="font-mono-tabular">
                              {r.requestedQuantity} {r.unit}
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-[#6E5843]">
                            {r.id} · Donor: {r.donorName} · Volunteer:{' '}
                            {r.volunteerName || 'Waiting for free volunteer'}
                          </p>
                        </div>
                        <span className={`text-xs ${getStatusTextClass(r.status)}`}>
                          {r.statusLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {user.role === UserRole.VOLUNTEER && (
            <div className="rounded-xl border border-[#E5D7BE] border-t-[3px] border-t-[#4F5D95] bg-[#FFFDF5] p-6">
              <h3 className="text-lg font-semibold text-[#3E2C1C]">
                My Assigned Pickup &amp; Delivery Tasks
              </h3>
              <p className="mt-0.5 text-sm text-[#6E5843]">
                Complete pickup and delivery steps to free your status for the next urgent request.
              </p>
              {requests.length === 0 ? (
                <p className="mt-6 text-sm text-[#6E5843]">
                  No delivery tasks assigned yet. Stay online to receive nearest-zone allocations.
                </p>
              ) : (
                <div className="mt-4 divide-y divide-[#F4ECDC]">
                  {requests.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-tabular text-xs font-semibold text-[#4F5D95]">
                            {r.id}
                          </span>
                          <span className="font-semibold text-[#3E2C1C]">
                            {r.foodName} ({r.requestedQuantity} {r.unit})
                          </span>
                        </div>
                        <p className="text-xs text-[#5A4532]">
                          Pickup: {r.pickupAddress} ({r.pickupZone})
                        </p>
                        <p className="text-xs text-[#5A4532]">
                          Drop-off: {r.ngoName} · {r.dropAddress}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs ${getStatusTextClass(r.status)}`}>
                          {r.statusLabel}
                        </span>
                        {r.status === DonationStatus.ALLOCATED && (
                          <button
                            type="button"
                            onClick={() => onMarkPickedUp(r.id)}
                            className="rounded-lg bg-[#4F5D95] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#3E4B7C] whitespace-nowrap"
                          >
                            Mark Picked Up
                          </button>
                        )}
                        {r.status === DonationStatus.PICKED_UP && (
                          <button
                            type="button"
                            onClick={() => onMarkDelivered(r.id)}
                            className="rounded-lg bg-[#5E8C5A] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#4B7448] whitespace-nowrap"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="rounded-xl border border-[#E5D7BE] border-t-[3px] border-t-[#2F6F73] bg-[#FFFDF5] p-6">
          <div className="flex items-center justify-between border-b border-[#EFE5D0] pb-3">
            <h3 className="text-base font-semibold text-[#3E2C1C]">Notifications</h3>
            <span className="font-mono-tabular text-xs font-medium text-[#2F6F73]">
              {notifications.length} items
            </span>
          </div>

          {notifications.length === 0 ? (
            <p className="mt-4 text-sm text-[#6E5843]">No notifications yet.</p>
          ) : (
            <div className="mt-3 max-h-[520px] divide-y divide-[#F4ECDC] overflow-y-auto">
              {notifications.map((n) => (
                <div key={n.id} className="py-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#2F6F73]">{n.category}</span>
                    <span className="font-mono-tabular text-[#8A715A]">
                      {new Date(n.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#5A4532]">
                    {n.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};
