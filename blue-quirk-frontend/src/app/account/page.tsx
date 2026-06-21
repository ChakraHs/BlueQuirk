"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Heart,
  Loader2,
  Lock,
  LogOut,
  Package,
  ShoppingBag,
  User as UserIcon,
} from "lucide-react";
import RoleGuard from "@/components/auth/RoleGuard";
import { getAuthUser, logout, type AuthUser } from "@/lib/auth";
import { IdentityService, type Profile } from "@/services/identity.service";

type Tab = "profile" | "security" | "orders";

const TABS: { id: Tab; label: string; icon: typeof UserIcon }[] = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "security", label: "Security", icon: Lock },
  { id: "orders", label: "Orders", icon: Package },
];

export default function AccountPage() {
  return (
    <RoleGuard requireRole="user">
      <AccountContent />
    </RoleGuard>
  );
}

function AccountContent() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("profile");

  useEffect(() => {
    const user = getAuthUser();
    setAuthUser(user);
    if (!user) {
      setLoading(false);
      return;
    }
    IdentityService.getProfile(user.id)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  // Prefer the freshly-fetched profile, fall back to token claims.
  const display = useMemo(() => {
    const firstName = profile?.firstName || authUser?.firstName || "";
    const lastName = profile?.lastName || authUser?.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim() || authUser?.username || "Your account";
    const initials =
      (firstName[0] ?? authUser?.username?.[0] ?? "U").toUpperCase() +
      (lastName[0] ?? "").toUpperCase();
    return {
      fullName,
      initials,
      email: profile?.email || authUser?.email || "",
      username: profile?.username || authUser?.username || "",
      memberSince: profile?.createdDate
        ? new Date(profile.createdDate).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
          })
        : null,
    };
  }, [profile, authUser]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
      {/* Top bar */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/fr"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Back to store
        </Link>
        <Link href="/fr" className="text-xl font-extrabold tracking-tight">
          Blue<span className="text-blue-600">Quirk</span>
        </Link>
      </div>

      {/* Hero */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="h-24 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700" />
        <div className="flex flex-col items-start gap-4 px-6 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="-mt-10 flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-blue-100 text-2xl font-bold text-blue-700 shadow-sm">
              {display.initials}
            </div>
            <div className="pb-1">
              <h1 className="text-xl font-bold tracking-tight">{display.fullName}</h1>
              <p className="text-sm text-gray-500">{display.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  Member
                </span>
                {display.memberSince && (
                  <span className="text-xs text-gray-400">
                    Since {display.memberSince}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => logout("/login")}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Side nav */}
        <nav className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-2 lg:flex-col lg:overflow-visible">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                tab === id
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
          <Link
            href="/fr/wishlist"
            className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
          >
            <Heart size={18} />
            Wishlist
          </Link>
        </nav>

        {/* Panel */}
        <div className="min-w-0">
          {loading ? (
            <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-gray-200 bg-white">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : tab === "profile" ? (
            <ProfileTab
              userId={authUser!.id}
              profile={profile}
              fallback={authUser!}
              onSaved={setProfile}
            />
          ) : tab === "security" ? (
            <SecurityTab />
          ) : (
            <OrdersTab />
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Profile tab ----------------------------- */

function ProfileTab({
  userId,
  profile,
  fallback,
  onSaved,
}: {
  userId: string;
  profile: Profile | null;
  fallback: AuthUser;
  onSaved: (p: Profile) => void;
}) {
  const [firstName, setFirstName] = useState(profile?.firstName ?? fallback.firstName);
  const [lastName, setLastName] = useState(profile?.lastName ?? fallback.lastName);
  const [email, setEmail] = useState(profile?.email ?? fallback.email);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const username = profile?.username ?? fallback.username;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage({ type: "err", text: "Please enter a valid email address." });
      return;
    }

    setSaving(true);
    try {
      const updated = await IdentityService.updateProfile(userId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      });
      onSaved(updated);
      setMessage({ type: "ok", text: "Your profile has been updated." });
    } catch {
      setMessage({ type: "err", text: "Could not save your changes. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Personal information" subtitle="Update the details on your account.">
      <Banner message={message} />
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First name">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className={inputClass}
            />
          </Field>
          <Field label="Last name">
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </Field>

        <Field label="Username" hint="Your username cannot be changed.">
          <input value={username} disabled className={`${inputClass} bg-gray-50 text-gray-500`} />
        </Field>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Card>
  );
}

/* ----------------------------- Security tab ---------------------------- */

function SecurityTab() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (next.length < 6) {
      setMessage({ type: "err", text: "New password must be at least 6 characters." });
      return;
    }
    if (next !== confirm) {
      setMessage({ type: "err", text: "New passwords do not match." });
      return;
    }

    setSaving(true);
    try {
      await IdentityService.changePassword(current, next);
      setMessage({ type: "ok", text: "Your password has been changed." });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      setMessage({
        type: "err",
        text: "Could not change your password. Check your current password and try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Password & security" subtitle="Choose a strong password to keep your account safe.">
      <Banner message={message} />
      <form onSubmit={handleSubmit} className="max-w-md space-y-5">
        <Field label="Current password">
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            className={inputClass}
          />
        </Field>
        <Field label="New password">
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
            className={inputClass}
          />
        </Field>
        <Field label="Confirm new password">
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
            className={inputClass}
          />
        </Field>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </Card>
  );
}

/* ----------------------------- Orders tab ------------------------------ */

function OrdersTab() {
  return (
    <Card title="Order history" subtitle="Track and review your purchases.">
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <ShoppingBag size={26} />
        </div>
        <h3 className="text-base font-semibold text-gray-900">No orders yet</h3>
        <p className="mt-1 max-w-xs text-sm text-gray-500">
          When you place an order, it will appear here so you can track it.
        </p>
        <Link
          href="/fr"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <ShoppingBag size={16} />
          Start shopping
        </Link>
      </div>
    </Card>
  );
}

/* ------------------------------- UI bits ------------------------------- */

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20";

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <header className="mb-6">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function Banner({ message }: { message: { type: "ok" | "err"; text: string } | null }) {
  if (!message) return null;
  const ok = message.type === "ok";
  return (
    <div
      role="alert"
      className={`mb-5 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
        ok
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {ok ? (
        <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
      ) : (
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
      )}
      <span>{message.text}</span>
    </div>
  );
}
