import type { Metadata } from "next";
import LegalPageLayout from "@/components/public-ui/LegalPageLayout";
import { Mail, MessageSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us & Support",
  description:
    "Get in touch with the AstreWork team. Reach out for support, feedback, feature requests, or enterprise partnerships.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactUs() {
  return (
    <LegalPageLayout title="Contact Us">
      <p className="text-lg text-[#424245] mb-10">
        Have questions, feedback, or need help with your AstreWork workspace? We're here to help.
      </p>

      <div className="grid sm:grid-cols-2 gap-6 mt-8">
        <div className="p-6 rounded-2xl border border-black/[0.04] bg-[#fbfbfd]">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <Mail className="w-5 h-5 text-[#0071e3]" />
          </div>
          <h3 className="!mt-0 text-[17px] font-semibold text-[#1d1d1f]">Email Support</h3>
          <p className="text-[14px] text-[#6e6e73] !mb-4">
            Reach out to our support team for any technical issues or billing inquiries. We typically respond within 24 hours.
          </p>
          <a href="mailto:support@astrework.com" className="text-[14px] font-medium text-[#0071e3] hover:underline">
            support@astrework.com
          </a>
        </div>

        <div className="p-6 rounded-2xl border border-black/[0.04] bg-[#fbfbfd]">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <MessageSquare className="w-5 h-5 text-[#0071e3]" />
          </div>
          <h3 className="!mt-0 text-[17px] font-semibold text-[#1d1d1f]">Feedback & Feature Requests</h3>
          <p className="text-[14px] text-[#6e6e73] !mb-4">
            Got an idea to make AstreWork better? We love hearing from our users. Send your thoughts directly to the product team.
          </p>
          <a href="mailto:feedback@astrework.com" className="text-[14px] font-medium text-[#0071e3] hover:underline">
            feedback@astrework.com
          </a>
        </div>
      </div>

      <div className="mt-12">
        <h2>Business Inquiries</h2>
        <p>
          For partnerships, press inquiries, or enterprise deployments, please contact our business team at <a href="mailto:hello@astrework.com">hello@astrework.com</a>.
        </p>
      </div>
    </LegalPageLayout>
  );
}
