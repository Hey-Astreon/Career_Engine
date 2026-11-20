import OnboardingWizard from "@/components/OnboardingWizard";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StrideLogo } from "@/components/brand/StrideLogo";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/register");
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4 sm:p-8 font-[var(--font-inter)] selection:bg-blue-100 selection:text-blue-900">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex justify-center items-center mb-6">
            <Link href="/" className="inline-block transition-transform hover:scale-105">
              <StrideLogo variant="light" height={36} />
            </Link>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] mb-2">Set up your workspace</h1>
          <p className="text-[#86868b] text-[15px] font-medium">Let&apos;s personalize Stride for your career goals.</p>
        </div>
        
        {/* Wizard */}
        <div className="bg-white rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-black/[0.04] p-8 sm:p-12">
          <OnboardingWizard />
        </div>
      </div>
    </div>
  );
}
