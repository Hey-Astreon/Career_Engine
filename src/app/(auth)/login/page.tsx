"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

/* ─── Google SVG ─────────────────────────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

/* ─── GitHub SVG ──────────────────────────────────────────────────────────── */
function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

/* ─── Error Banner ────────────────────────────────────────────────────────── */
function LoginErrorBanner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  if (!error) return null;

  let message = "An error occurred during authentication. Please try again.";
  if (error === "OAuthAccountNotLinked" || error === "Callback") {
    message = "Your email is registered with another sign-in method. Account linking is enabled — please click sign in again.";
  } else if (error === "CredentialsSignin") {
    message = "Invalid email or password. Please verify your details.";
  } else if (error === "AccessDenied") {
    message = "Access was denied. Please approve required permissions.";
  }

  return (
    <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[13px] font-medium leading-relaxed flex items-start gap-2.5">
      <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/* ─── OAuth Button ────────────────────────────────────────────────────────── */
function OAuthButton({
  onClick,
  disabled,
  icon,
  label,
  isLoading,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  isLoading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full h-12 bg-white hover:bg-[#f9f9fb] border border-[#e5e5ea] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-[14px] font-semibold text-[#1d1d1f] flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-sm"
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-[#86868b]" /> : icon}
      {label}
    </button>
  );
}

/* ─── Stat Pill ───────────────────────────────────────────────────────────── */
function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-white/80 border border-[#e5e5ea]/80 rounded-full px-3.5 py-1.5 text-[12px] shadow-sm">
      <span className="font-bold text-[#0071e3]">{value}</span>
      <span className="text-[#86868b] font-medium">{label}</span>
    </div>
  );
}

/* ─── Main Login Page ─────────────────────────────────────────────────────── */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSignIn = async (provider: string) => {
    setIsLoading(provider);
    try {
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(null);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading("credentials");
    try {
      await signIn("credentials", { email, password, callbackUrl: "/dashboard" });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center font-[var(--font-inter)] selection:bg-blue-100 selection:text-blue-900 px-4 py-12 overflow-hidden">

      {/* ── Mesh Gradient Background ──────────────────────────────────────── */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        {/* Base */}
        <div className="absolute inset-0 bg-[#f8faff]" />
        {/* Top-left blue orb */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-100/60 rounded-full blur-3xl" />
        {/* Bottom-right lavender orb */}
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-3xl" />
        {/* Center soft glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-blue-50/70 rounded-full blur-3xl" />
        {/* Subtle dot grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "radial-gradient(circle, #1d4ed8 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* ── Floating Card ─────────────────────────────────────────────────── */}
      <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-3 duration-500">

        {/* Card */}
        <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-[1.75rem] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.04),0_20px_60px_-10px_rgba(0,0,0,0.08)] px-8 py-9">

          {/* Logo */}
          <div className="flex justify-center mb-7">
            <Link href="/" className="inline-block transition-all hover:opacity-80 hover:scale-[1.02] active:scale-[0.98]">
              <Image
                src="/astrework-brand.png"
                alt="AstreWork"
                width={1760}
                height={363}
                className="h-9 w-auto object-contain"
                priority
              />
            </Link>
          </div>

          {/* Heading */}
          <div className="text-center mb-7">
            <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-[#1d1d1f] mb-1.5">
              Welcome back
            </h1>
            <p className="text-[14px] text-[#86868b] font-medium">
              Sign in to your career workspace
            </p>
          </div>

          {/* Error banner */}
          <Suspense fallback={null}>
            <LoginErrorBanner />
          </Suspense>

          {/* OAuth — Clerk-style: always first */}
          <div className="space-y-2.5 mb-5">
            <OAuthButton
              onClick={() => handleSignIn("google")}
              disabled={isLoading !== null}
              icon={<GoogleIcon />}
              label="Continue with Google"
              isLoading={isLoading === "google"}
            />
            <OAuthButton
              onClick={() => handleSignIn("github")}
              disabled={isLoading !== null}
              icon={<GitHubIcon />}
              label="Continue with GitHub"
              isLoading={isLoading === "github"}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-[#e5e5ea]" />
            <span className="text-[12px] font-medium text-[#b0b0b8] tracking-wide">or continue with email</span>
            <div className="h-px flex-1 bg-[#e5e5ea]" />
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              autoComplete="email"
              className="w-full h-12 bg-[#f5f5f7] hover:bg-[#ebebeb] focus:bg-white focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] rounded-xl px-4 text-[14px] text-[#1d1d1f] placeholder:text-[#b0b0b8] transition-all outline-none border border-transparent"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              autoComplete="current-password"
              className="w-full h-12 bg-[#f5f5f7] hover:bg-[#ebebeb] focus:bg-white focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] rounded-xl px-4 text-[14px] text-[#1d1d1f] placeholder:text-[#b0b0b8] transition-all outline-none border border-transparent"
            />

            <button
              type="submit"
              disabled={isLoading === "credentials" || !email || !password}
              className="group relative w-full h-12 bg-[#0071e3] hover:bg-[#0077ED] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-[14px] transition-all flex items-center justify-center overflow-hidden active:scale-[0.98] shadow-[0_2px_8px_rgba(0,113,227,0.25)] hover:shadow-[0_4px_14px_rgba(0,113,227,0.35)]"
            >
              {isLoading === "credentials" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-[13px] text-[#86868b]">
            New to AstreWork?{" "}
            <Link
              href="/onboard"
              className="text-[#0071e3] font-semibold hover:text-[#0077ED] transition-colors inline-flex items-center gap-0.5"
            >
              Create an account
              <ArrowRight className="w-3 h-3" />
            </Link>
          </p>
        </div>

        {/* ── Trust Pills below card ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          <StatPill value="20+" label="job platforms" />
          <StatPill value="98%" label="ATS pass rate" />
          <StatPill value="Free" label="forever" />
        </div>
      </div>
    </div>
  );
}
