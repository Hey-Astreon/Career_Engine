import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export default function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-white font-[var(--font-inter)] text-[#1d1d1f] selection:bg-blue-100 selection:text-blue-900 pt-24 pb-20">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-xl border-b border-black/[0.04] z-50 flex items-center px-6 sm:px-12">
        <div className="flex-1 flex items-center space-x-2.5">
          <Link href="/" className="flex items-center space-x-2.5">
            <svg viewBox="0 0 100 100" className="w-5 h-5 text-[#1d1d1f]" fill="currentColor">
              <path d="M10,90 Q50,10 90,90 H70 Q50,40 30,90 Z" />
            </svg>
            <span className="font-bold tracking-tight text-[15px]">RCMS</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 sm:px-12">
        <Link 
          href="/" 
          className="inline-flex items-center text-[13px] font-medium text-[#6e6e73] hover:text-[#1d1d1f] transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Home
        </Link>
        
        <header className="mb-12">
          <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-[-0.02em] leading-tight text-[#1d1d1f] mb-4">
            {title}
          </h1>
          {lastUpdated && (
            <p className="text-[14px] text-[#86868b] font-medium">
              Last Updated: {lastUpdated}
            </p>
          )}
        </header>

        <article className="max-w-none text-[#424245] leading-relaxed 
          [&>h2]:text-[24px] [&>h2]:font-semibold [&>h2]:text-[#1d1d1f] [&>h2]:mt-10 [&>h2]:mb-4 [&>h2]:tracking-tight
          [&>h3]:text-[18px] [&>h3]:font-semibold [&>h3]:text-[#1d1d1f] [&>h3]:mt-8 [&>h3]:mb-3
          [&>p]:mb-5 [&>p]:leading-[1.7]
          [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-5 [&>ul>li]:mb-2
          [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-5 [&>ol>li]:mb-2
          [&_a]:text-[#0071e3] [&_a]:underline-offset-2 hover:[&_a]:underline
          [&>strong]:font-semibold [&>strong]:text-[#1d1d1f]
        ">
          {children}
        </article>
      </div>
    </div>
  );
}
