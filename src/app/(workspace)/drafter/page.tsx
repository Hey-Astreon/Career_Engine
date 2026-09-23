"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DrafterRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/resume-builder");
  }, [router]);

  return (
    <div className="flex h-[60vh] flex-col items-center justify-center text-center">
      <div className="ce-page-eyebrow">Redirecting</div>
      <h1 className="ce-page-title mt-2">Loading Complete Application Kit...</h1>
      <p className="ce-page-copy mt-2">
        Taking you to the unified 1-Page ATS Resume & Outreach Suite.
      </p>
    </div>
  );
}
