import React, { useState } from 'react';
import { UserSummaryDTO } from '../shared/types.ts';

interface AuthViewProps {
  demoUsers: UserSummaryDTO[];
  adminHint: { email: string; password: string } | null;
  zones: string[];
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (payload: Record<string, unknown>) => Promise<void>;
}

export const AuthView: React.FC<AuthViewProps> = ({
  demoUsers,
  adminHint,
  zones,
  onLogin,
  onRegister,
}) => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [role, setRole] = useState<'DONOR' | 'NGO' | 'VOLUNTEER'>('DONOR');
  const [donorType, setDonorType] = useState<'RESTAURANT' | 'HOTEL' | 'EVENT_ORGANIZER'>('RESTAURANT');
  const [extraInfo, setExtraInfo] = useState('');
  const [starRating, setStarRating] = useState('4');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [beneficiaryCapacity, setBeneficiaryCapacity] = useState('150');
  const [vehicleType, setVehicleType] = useState('Electric Scooter');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [cityZone, setCityZone] = useState(zones[0] || 'Chennai - T. Nagar');
  const [registering, setRegistering] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      await onLogin(loginEmail.trim(), loginPassword);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    try {
      await onRegister({
        role,
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        address: address.trim(),
        cityZone,
        donorType,
        extraInfo: extraInfo.trim(),
        starRating: Number(starRating || 4),
        licenseNumber: licenseNumber.trim(),
        registrationNumber: registrationNumber.trim(),
        beneficiaryCapacity: Number(beneficiaryCapacity || 150),
        vehicleType: vehicleType.trim(),
      });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <section aria-label="Authentication" className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="rounded-xl border border-[#E5D7BE] border-t-[3px] border-t-[#2F6F73] bg-[#FFFDF5] p-6">
        <div className="border-b border-[#EFE5D0] pb-3">
          <h2 className="text-xl font-semibold text-[#3E2C1C]">Sign In</h2>
          <p className="mt-1 text-sm text-[#6E5843]">
            Access your Donor, NGO, Volunteer, or Admin workspace.
          </p>
        </div>

        <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-[#3E2C1C]">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="donor1@foodbridge.org"
              className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] focus:border-[#2F6F73] focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/15"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-[#3E2C1C]">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Enter password"
              className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] focus:border-[#2F6F73] focus:outline-none focus:ring-2 focus:ring-[#2F6F73]/15"
            />
          </div>
          <button
            type="submit"
            disabled={loggingIn}
            className="w-full rounded-lg bg-[#2F6F73] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#25585C] disabled:opacity-60"
          >
            {loggingIn ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 border-t border-[#EFE5D0] pt-5">
          <h3 className="text-sm font-semibold text-[#3E2C1C]">
            Quick Demo Accounts
          </h3>
          <p className="mt-0.5 text-xs text-[#6E5843]">
            Select any seeded South Indian account to sign in immediately.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {demoUsers.map((u) => {
              const roleStyle =
                u.role === 'DONOR'
                  ? 'border-[#E7C6B9] bg-[#FBF2EE] hover:bg-[#F7E5DD]'
                  : u.role === 'NGO'
                    ? 'border-[#C8DBC6] bg-[#EFF5EE] hover:bg-[#E2EDE0]'
                    : 'border-[#C9CFE6] bg-[#EFF1F8] hover:bg-[#E2E6F3]';
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => onLogin(u.email, 'pass123')}
                  className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors ${roleStyle}`}
                >
                  <span className="text-xs font-semibold text-[#3E2C1C]">{u.name}</span>
                  <span className="text-xs text-[#6E5843]">
                    {u.roleLabel} · {u.cityZone}
                  </span>
                </button>
              );
            })}
            {adminHint && (
              <button
                type="button"
                onClick={() => onLogin(adminHint.email, adminHint.password)}
                className="flex flex-col items-start rounded-lg border border-[#2F6F73] bg-[#2F6F73] px-3 py-2 text-left text-white transition-colors hover:bg-[#25585C]"
              >
                <span className="text-xs font-semibold">Lakshmi Narayanan (Admin)</span>
                <span className="text-xs text-[#DCF0EF]">
                  Full Concurrency &amp; Fleet Overview
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#E5D7BE] border-t-[3px] border-t-[#D9A441] bg-[#FFFDF5] p-6">
        <div className="border-b border-[#EFE5D0] pb-3">
          <h2 className="text-xl font-semibold text-[#3E2C1C]">Create Account</h2>
          <p className="mt-1 text-sm text-[#6E5843]">
            Register a new Food Donor, NGO, or Delivery Volunteer account.
          </p>
        </div>

        <form onSubmit={handleRegisterSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="reg-role" className="block text-sm font-medium text-[#3E2C1C]">
                Account Role
              </label>
              <select
                id="reg-role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'DONOR' | 'NGO' | 'VOLUNTEER')}
                className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] focus:border-[#2F6F73] focus:outline-none"
              >
                <option value="DONOR">Food Donor</option>
                <option value="NGO">NGO / Charity Kitchen</option>
                <option value="VOLUNTEER">Delivery Volunteer</option>
              </select>
            </div>

            <div>
              <label htmlFor="reg-zone" className="block text-sm font-medium text-[#3E2C1C]">
                City Zone
              </label>
              <select
                id="reg-zone"
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
          </div>

          {role === 'DONOR' && (
            <div className="grid grid-cols-1 gap-4 border-y border-[#EFE5D0] py-4 sm:grid-cols-2">
              <div>
                <label htmlFor="reg-donor-type" className="block text-sm font-medium text-[#3E2C1C]">
                  Donor Category
                </label>
                <select
                  id="reg-donor-type"
                  value={donorType}
                  onChange={(e) =>
                    setDonorType(
                      e.target.value as 'RESTAURANT' | 'HOTEL' | 'EVENT_ORGANIZER',
                    )
                  }
                  className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] focus:border-[#2F6F73] focus:outline-none"
                >
                  <option value="RESTAURANT">Restaurant</option>
                  <option value="HOTEL">Hotel</option>
                  <option value="EVENT_ORGANIZER">Event Organizer</option>
                </select>
              </div>
              <div>
                <label htmlFor="reg-license" className="block text-sm font-medium text-[#3E2C1C]">
                  FSSAI / License No.
                </label>
                <input
                  id="reg-license"
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="FSSAI-TN-2026-991"
                  className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] focus:border-[#2F6F73] focus:outline-none"
                />
              </div>
              {donorType === 'HOTEL' ? (
                <div className="sm:col-span-2">
                  <label htmlFor="reg-stars" className="block text-sm font-medium text-[#3E2C1C]">
                    Hotel Star Rating (1–5)
                  </label>
                  <input
                    id="reg-stars"
                    type="number"
                    min="1"
                    max="5"
                    value={starRating}
                    onChange={(e) => setStarRating(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] focus:border-[#2F6F73] focus:outline-none"
                  />
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <label htmlFor="reg-extra" className="block text-sm font-medium text-[#3E2C1C]">
                    {donorType === 'RESTAURANT' ? 'Cuisine Type' : 'Event Scale'}
                  </label>
                  <input
                    id="reg-extra"
                    type="text"
                    value={extraInfo}
                    onChange={(e) => setExtraInfo(e.target.value)}
                    placeholder={
                      donorType === 'RESTAURANT' ? 'e.g. Chettinad Vegetarian' : 'e.g. Temple Festival'
                    }
                    className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] focus:border-[#2F6F73] focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {role === 'NGO' && (
            <div className="grid grid-cols-1 gap-4 border-y border-[#EFE5D0] py-4 sm:grid-cols-2">
              <div>
                <label htmlFor="reg-ngo-no" className="block text-sm font-medium text-[#3E2C1C]">
                  NGO Registration No.
                </label>
                <input
                  id="reg-ngo-no"
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="NGO-TN-2026-10"
                  className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] focus:border-[#2F6F73] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="reg-cap" className="block text-sm font-medium text-[#3E2C1C]">
                  Daily Capacity (Meals)
                </label>
                <input
                  id="reg-cap"
                  type="number"
                  min="1"
                  value={beneficiaryCapacity}
                  onChange={(e) => setBeneficiaryCapacity(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] tabular-nums focus:border-[#2F6F73] focus:outline-none"
                />
              </div>
            </div>
          )}

          {role === 'VOLUNTEER' && (
            <div className="border-y border-[#EFE5D0] py-4">
              <label htmlFor="reg-vehicle" className="block text-sm font-medium text-[#3E2C1C]">
                Vehicle Type
              </label>
              <input
                id="reg-vehicle"
                type="text"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                placeholder="Electric Scooter / Delivery Van / Cargo Auto"
                className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] focus:border-[#2F6F73] focus:outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="reg-name" className="block text-sm font-medium text-[#3E2C1C]">
                Full / Organization Name
              </label>
              <input
                id="reg-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Venkatesh Iyer or Priya Rajan"
                className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] focus:border-[#2F6F73] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="reg-phone" className="block text-sm font-medium text-[#3E2C1C]">
                Phone (10 digits)
              </label>
              <input
                id="reg-phone"
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9840123456"
                className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] font-mono-tabular focus:border-[#2F6F73] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-[#3E2C1C]">
                Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="venkatesh@foodbridge.org"
                className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] focus:border-[#2F6F73] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-[#3E2C1C]">
                Password (min 4 chars)
              </label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create password"
                className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] focus:border-[#2F6F73] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-address" className="block text-sm font-medium text-[#3E2C1C]">
              Street Address &amp; Pincode
            </label>
            <input
              id="reg-address"
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="47, Usman Road, T. Nagar, Chennai - 600017"
              className="mt-1.5 w-full rounded-lg border border-[#DECFAF] bg-white px-3 py-2 text-sm text-[#3E2C1C] focus:border-[#2F6F73] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={registering}
            className="w-full rounded-lg bg-[#4F5D95] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3E4B7C] disabled:opacity-60"
          >
            {registering ? 'Creating Account...' : 'Register & Sign In'}
          </button>
        </form>
      </div>
    </section>
  );
};
