"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Globe2, Target, FileCheck, Sparkles, ChevronRight, Briefcase, Clock, Send } from "lucide-react";

const navItems = [
  { name: "Discovery", href: "/", icon: Globe2, badge: "LIVE" },
  { name: "Applications", href: "/applications", icon: Briefcase },
  { name: "Match Studio", href: "/match", icon: Target },
  { name: "Recruiter Radar", href: "/outreach", icon: Send, badge: "NEW" },
  { name: "Complete Application Kit", href: "/resume-builder", icon: FileCheck },
  { name: "ATS Resume Maker", href: "/resume-maker", icon: Sparkles, badge: "TIER-1" },
  { name: "Alert Settings", href: "/settings", icon: Clock },
];

export function Sidebar() {
  const pathname = usePathname();
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/scheduler");
        const data = await res.json();
        if (data.success) {
          setSchedulerStatus(data.status);
        }
      } catch (err) {
        console.error("Failed to load scheduler status", err);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="ce-rail">
      <Link
        href="/"
        className="group block transition-all"
        aria-label="RCMS - Remote Career Management System"
      >
        <div className="flex h-[54px] w-full items-center justify-center rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 shadow-xs transition-all duration-200 group-hover:border-[var(--blue)] group-hover:shadow-sm">
          <Image
            src="/rcms-logo.png"
            alt="RCMS - Remote Career Management System"
            width={180}
            height={50}
            className="h-full w-auto max-w-full object-contain"
            priority
          />
        </div>
      </Link>
      <div className="ce-nav-label !mt-4">Candidate workspace</div>
      <nav className="ce-nav" aria-label="RCMS navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`ce-nav-link${active ? " active" : ""}`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
              {item.badge ? (
                <em className="ce-nav-badge">{item.badge}</em>
              ) : (
                <ChevronRight className="w-3 h-3 opacity-40" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="ce-rail-context">
        <span>Discovery scope</span>
        <strong>Global active feed</strong>
        <p>Remote roles · all dates · optional experience filters</p>
        <div className="ce-progress">
          <i />
        </div>
      </div>
      <div className="ce-rail-footer flex flex-col gap-1 items-start">
        <div>
          <i className="ce-dot" />RCMS ONLINE
        </div>
        {schedulerStatus && (
          <div className="text-[9px] text-gray-500 flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" />
            {schedulerStatus.isRunning ? (
              <span className="text-[var(--blue)]">
                Auto-sync active ({Math.round(schedulerStatus.intervalMs / 3600000)}h)
              </span>
            ) : (
              <span>Auto-sync paused</span>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
