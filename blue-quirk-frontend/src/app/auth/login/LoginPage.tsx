"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Lock, User, AlertCircle } from "lucide-react";
import { authProvider } from "../authProvider";
import { accountHref } from "@/lib/auth";
import { track } from "@/lib/analytics/tracker";

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Optional post-login destination (e.g. set by the checkout flow).
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    setRedirectTo(new URLSearchParams(window.location.search).get("redirect"));
  }, []);

  const signupHref = redirectTo
    ? `/signup?redirect=${encodeURIComponent(redirectTo)}`
    : "/signup";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError("Please enter your credentials.");
      return;
    }

    // authProvider accepts either a username (`login`) or an `email`.
    // Route the single identifier field to the right one based on "@".
    const isEmail = identifier.includes("@");
    const credentials = isEmail
      ? { email: identifier.trim(), password }
      : { login: identifier.trim(), password };

    setLoading(true);
    try {
      await authProvider.login(credentials);
      track("login");
      // Honour an explicit redirect (e.g. back to checkout); otherwise route by
      // role: admins to the dashboard, customers to their account.
      router.push(redirectTo || accountHref());
    } catch {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full grid lg:grid-cols-2 bg-white text-gray-900">
      {/* ---- Branding panel ---- */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-12 text-white">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -right-20 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />

        <Link
          href="/"
          className="relative z-10 text-2xl font-bold tracking-tight"
        >
          BlueQuirk
        </Link>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Welcome back.
          </h1>
          <p className="mt-4 text-blue-100">
            Sign in to your dashboard to manage products, orders, and your
            storefront — all in one place.
          </p>
        </div>

        <p className="relative z-10 text-sm text-blue-200">
          © {new Date().getFullYear()} BlueQuirk. All rights reserved.
        </p>
      </aside>

      {/* ---- Form panel ---- */}
      <section className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          {/* mobile logo */}
          <Link
            href="/"
            className="mb-10 block text-2xl font-bold tracking-tight text-gray-900 lg:hidden"
          >
            BlueQuirk
          </Link>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
            <p className="mt-2 text-sm text-gray-500">
              Enter your credentials to access your account.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* identifier */}
            <div>
              <label
                htmlFor="identifier"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Email or username
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>

            {/* password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 transition hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link
              href={signupHref}
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Sign up
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
