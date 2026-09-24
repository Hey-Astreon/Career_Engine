import type { Metadata } from "next";
import LegalPageLayout from "@/components/public-ui/LegalPageLayout";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us | Our Mission & Story",
  description:
    "We built AstreWork to solve a single, exhausting problem: sending resumes into the void. Learn how our autonomous career engine empowers engineers.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutUs() {
  return (
    <LegalPageLayout title="About Us">
      <p className="text-xl font-medium text-[#1d1d1f] mb-8">
        We built AstreWork to solve a single, exhausting problem: sending resumes into the void.
      </p>

      <h2>Our Mission</h2>
      <p>
        The modern job search is broken. Highly qualified candidates spend hours adjusting margins, tweaking keywords, and manually tracking spreadsheets of applications across dozens of job boards. And despite all that effort, most applications are filtered out by Applicant Tracking Systems (ATS) before a human ever sees them.
      </p>
      <p>
        AstreWork was born out of frustration with this status quo. We believe that securing a great remote job shouldn't require you to become an expert in reverse-engineering recruiting software. 
      </p>

      <h2>What We Do</h2>
      <p>
        We automate the friction of the job hunt. By indexing verified remote jobs from top platforms and pairing them with a precision-engineered ATS resume builder, we ensure that your application actually gets read. Our platform scores your resume against the specific job description, tells you exactly what keywords are missing, and generates a clean, readable PDF that ATS systems love.
      </p>

      <h2>Our Philosophy</h2>
      <ul>
        <li><strong>Design matters:</strong> We believe professional software should feel premium, fast, and intuitive. No clutter, no lag.</li>
        <li><strong>Privacy first:</strong> Your career data is your own. We don't train public AI models on your private resumes.</li>
        <li><strong>Focus on the interview:</strong> Our goal is to handle the mechanical parts of applying so you can focus your energy on what matters: preparing for the interview and landing the job.</li>
      </ul>

      <div className="mt-12 pt-8 border-t border-black/[0.04]">
        <Link 
          href="/onboard"
          className="inline-flex items-center justify-center bg-[#0071e3] text-white px-6 py-3 rounded-full hover:bg-[#0077ED] transition-colors text-[14px] font-semibold"
        >
          Start your free workspace
        </Link>
      </div>
    </LegalPageLayout>
  );
}
