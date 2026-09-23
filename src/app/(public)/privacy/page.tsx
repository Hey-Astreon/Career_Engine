import LegalPageLayout from "@/components/public-ui/LegalPageLayout";

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="September 23, 2026">
      <p>
        At RCMS (Remote Career Management System), we are committed to protecting your privacy and ensuring that your personal information is handled in a safe and responsible manner. This Privacy Policy outlines how we collect, use, and safeguard your data.
      </p>

      <h2>1. Information We Collect</h2>
      <p>
        We collect information that you provide directly to us, including:
      </p>
      <ul>
        <li><strong>Account Information:</strong> Your name, email address, and authentication credentials.</li>
        <li><strong>Career Data:</strong> Resumes, work history, skills, portfolios, and job preferences you upload or generate using our platform.</li>
        <li><strong>Usage Data:</strong> Information about how you interact with our platform, the jobs you track, and your application statuses.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>
        We use the collected data for the following purposes:
      </p>
      <ul>
        <li>To provide, maintain, and improve the RCMS platform.</li>
        <li>To power our AI resume optimization and ATS-scoring features.</li>
        <li>To send you transactional emails, account updates, and support messages.</li>
        <li>To monitor usage trends and improve the user experience.</li>
      </ul>

      <h2>3. Data Processing and AI</h2>
      <p>
        When you use our resume optimization tools, your resume text and target job descriptions are processed by our automated systems. We do not use your private personal data to train public AI models. Your career data remains yours, and is isolated to your account.
      </p>

      <h2>4. Data Sharing and Disclosure</h2>
      <p>
        We do not sell your personal information to third parties. We may share your information only in the following circumstances:
      </p>
      <ul>
        <li>With service providers who assist us in operating the platform (e.g., cloud hosting, email delivery).</li>
        <li>If required by law, subpoena, or other legal processes.</li>
        <li>To protect the rights, property, or safety of RCMS, our users, or the public.</li>
      </ul>

      <h2>5. Data Security</h2>
      <p>
        We implement industry-standard security measures, including encryption in transit and at rest, to protect your data from unauthorized access, alteration, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
      </p>

      <h2>6. Your Rights</h2>
      <p>
        You have the right to access, update, or delete your personal information at any time by logging into your account settings. If you wish to permanently delete your account and all associated data, you may do so or contact our support team for assistance.
      </p>
    </LegalPageLayout>
  );
}
