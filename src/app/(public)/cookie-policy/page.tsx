import LegalPageLayout from "@/components/public-ui/LegalPageLayout";

export default function CookiePolicy() {
  return (
    <LegalPageLayout title="Cookie Policy" lastUpdated="September 23, 2026">
      <p>
        This Cookie Policy explains how RCMS ("we", "us", or "our") uses cookies and similar tracking technologies when you visit our website and use our platform.
      </p>

      <h2>1. What are Cookies?</h2>
      <p>
        Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by online service providers to facilitate and help to make the interaction between users and websites faster and easier, as well as to provide reporting information.
      </p>

      <h2>2. How We Use Cookies</h2>
      <p>
        We use cookies for the following purposes:
      </p>
      <ul>
        <li><strong>Strictly Necessary Cookies:</strong> These are required for the operation of our platform. They include, for example, secure session cookies (such as those managed by NextAuth) that enable you to log into secure areas of our application.</li>
        <li><strong>Functionality Cookies:</strong> These are used to recognize you when you return to our website. This enables us to personalize our content for you and remember your preferences (for example, your choice of workspace settings).</li>
        <li><strong>Analytical/Performance Cookies:</strong> They allow us to recognize and count the number of visitors and to see how visitors move around our website when they are using it. This helps us to improve the way our website works, for example, by ensuring that users are finding what they are looking for easily.</li>
      </ul>

      <h2>3. Third-Party Cookies</h2>
      <p>
        In some special cases, we also use cookies provided by trusted third parties. For example, we use analytics providers to help us understand how you use the site and ways that we can improve your experience. These cookies may track things such as how long you spend on the site and the pages that you visit.
      </p>

      <h2>4. Managing Cookies</h2>
      <p>
        You have the right to decide whether to accept or reject cookies. You can set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our website though your access to some functionality and areas of our website may be restricted. 
      </p>
      <p>
        For more information on how to control cookies, check your browser or device's settings.
      </p>
    </LegalPageLayout>
  );
}
