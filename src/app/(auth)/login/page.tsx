"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { ArrowRight, Mail } from "lucide-react";

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
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center font-[var(--font-inter)] selection:bg-blue-100 selection:text-blue-900 px-4">
      
      {/* Brand logo */}
      <div className="absolute top-10 flex items-center justify-center space-x-2">
        <svg viewBox="0 0 100 100" className="w-8 h-8 text-black" fill="currentColor">
          <path d="M10,90 Q50,10 90,90 H70 Q50,40 30,90 Z" />
        </svg>
        <span className="font-bold tracking-tighter text-xl">RCMS</span>
      </div>

      <div className="w-full max-w-[400px] p-8 sm:p-10 bg-white/70 backdrop-blur-3xl rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-black/[0.04]">
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] mb-3">
            Welcome back
          </h1>
          <p className="text-[15px] text-[#86868b] font-medium leading-relaxed">
            Enter your details to sign in to your remote career workspace.
          </p>
        </div>

        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="w-full h-14 bg-[#f5f5f7] hover:bg-[#ebebeb] focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 rounded-2xl px-5 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] transition-all outline-none border border-transparent"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full h-14 bg-[#f5f5f7] hover:bg-[#ebebeb] focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 rounded-2xl px-5 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] transition-all outline-none border border-transparent"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading === "credentials" || !email || !password}
            className="group relative w-full h-14 bg-[#0071e3] hover:bg-[#0077ED] disabled:bg-[#0071e3]/60 disabled:cursor-not-allowed text-white rounded-2xl font-semibold text-[15px] transition-all flex items-center justify-center overflow-hidden"
          >
            <span className={`transition-transform duration-300 ${isLoading === "credentials" ? "translate-y-[-150%]" : "translate-y-0"}`}>
              Sign in with Email
            </span>
            {isLoading === "credentials" && (
              <span className="absolute inset-0 flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
            )}
          </button>
        </form>

        <div className="mt-8 mb-8 flex items-center justify-center gap-4">
          <div className="h-[1px] w-full bg-[#d2d2d7]/50" />
          <span className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wider">or</span>
          <div className="h-[1px] w-full bg-[#d2d2d7]/50" />
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleSignIn("google")}
            disabled={isLoading !== null}
            className="w-full h-14 bg-white hover:bg-[#f5f5f7] border border-[#d2d2d7] disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-[15px] font-semibold text-[#1d1d1f] flex items-center justify-center gap-3 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
          
          <button
            onClick={() => handleSignIn("github")}
            disabled={isLoading !== null}
            className="w-full h-14 bg-white hover:bg-[#f5f5f7] border border-[#d2d2d7] disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-[15px] font-semibold text-[#1d1d1f] flex items-center justify-center gap-3 transition-colors"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.24c3-.34 6-1.53 6-6.76a5.5 5.5 0 0 0-1.5-3.89 5.06 5.06 0 0 0-.14-3.82s-1.18-.38-3.9 1.46a13.38 13.38 0 0 0-7 0C4.68 1.14 3.5 1.52 3.5 1.52a5.06 5.06 0 0 0-.14 3.82A5.5 5.5 0 0 0 1.86 9.24c0 5.22 3 6.42 6 6.76-.73.66-1 1.76-1 2.94v4.32"></path>
            </svg>
            Continue with GitHub
          </button>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-[13px] text-[#86868b]">
            New to RCMS? <a href="/onboard" className="text-[#0071e3] hover:underline hover:text-[#0077ED] font-medium">Create an account <ArrowRight className="inline-block w-3 h-3 ml-0.5" /></a>
          </p>
        </div>
      </div>
    </div>
  );
}
