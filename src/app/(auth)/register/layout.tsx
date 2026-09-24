import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | Get Started Free",
  description: "Create your free AstreWork workspace to access 19-provider remote job discovery, ATS resume scoring, and application tracking.",
  alternates: {
    canonical: "/register",
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
