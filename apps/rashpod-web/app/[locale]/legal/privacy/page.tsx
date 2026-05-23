import { LegalPage } from "../legal-content";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This Privacy Policy explains how RashPOD collects, uses, stores, and protects personal information when you use our website, shop,
        designer platform, custom order service, corporate requests, or print-ready film service.
      </p>
      <p className="mt-4">By using RashPOD, you agree to the collection and use of information as described in this Policy.</p>

      <section>
        <h2>1. Information We Collect</h2>
        <p className="mt-4">We may collect information you provide directly to us, including:</p>
        <ul className="mt-4">
          <li>full name, email address, and phone number;</li>
          <li>delivery and billing addresses;</li>
          <li>account login and authentication details;</li>
          <li>order details, payment status, and support messages;</li>
          <li>product preferences, wishlist items, and browsing activity related to shop use;</li>
          <li>custom order briefs, corporate request details, deadlines, and budgets;</li>
          <li>uploaded logos, artwork, design files, and print-ready production files;</li>
          <li>designer portfolio links, profile information, and verification documents;</li>
          <li>payout and tax-related information for approved designers, where required.</li>
        </ul>
        <p className="mt-4">
          We may also collect technical information such as device type, browser, IP address, and cookies needed to operate and secure the platform.
        </p>
      </section>

      <section>
        <h2>2. How We Use Information</h2>
        <p className="mt-4">RashPOD uses personal information to:</p>
        <ul className="mt-4">
          <li>create and manage customer, designer, and business accounts;</li>
          <li>process orders, payments, production jobs, and deliveries;</li>
          <li>communicate order confirmations, production updates, and support responses;</li>
          <li>review designer applications, moderate content, and enforce platform policies;</li>
          <li>calculate royalties, commissions, and payout records for approved designers;</li>
          <li>prepare custom quotes, corporate offers, and production tickets;</li>
          <li>improve shop performance, security, fraud prevention, and customer experience;</li>
          <li>send service notifications and, where permitted, marketing updates you can opt out of.</li>
        </ul>
      </section>

      <section>
        <h2>3. Designer &amp; Creator Data</h2>
        <p className="mt-4">
          Designer accounts may include public profile information such as display name, handle, bio, portfolio links, and published listings.
          RashPOD also stores private designer data such as moderation history, royalty records, film consent decisions, payout details, and uploaded source files needed for production.
        </p>
        <p className="mt-4">
          Film-sale consent records, including grant and revocation timestamps, are stored to protect designer rights and support audit requirements.
        </p>
      </section>

      <section>
        <h2>4. Order, Delivery &amp; Film Data</h2>
        <p className="mt-4">
          Order data includes product or film selections, quantities, pricing, delivery method, tracking information, and production status.
          Delivery addresses and contact details are shared only as needed with RashPOD production staff and configured delivery providers such as Yandex Delivery, UzPost, or pickup handling teams.
        </p>
      </section>

      <section>
        <h2>5. Sharing &amp; Service Providers</h2>
        <p className="mt-4">We do not sell personal information. We may share data with trusted processors that help us operate RashPOD, such as:</p>
        <ul className="mt-4">
          <li>payment providers (for example Click);</li>
          <li>email and notification services (for example ZeptoMail);</li>
          <li>cloud storage and image processing infrastructure;</li>
          <li>delivery partners and logistics providers;</li>
          <li>moderation, analytics, and support tools required to run the platform securely.</li>
        </ul>
        <p className="mt-4">
          These providers may process data only for the services they perform on our behalf and under appropriate confidentiality and security obligations.
        </p>
      </section>

      <section>
        <h2>6. Storage &amp; Security</h2>
        <p className="mt-4">
          RashPOD stores operational data in secure cloud infrastructure and limits access to authorized staff and systems.
          Uploaded files, mockups, and production assets may be stored in cloud storage with access controls appropriate to their sensitivity.
        </p>
        <p className="mt-4">
          While we use reasonable safeguards, no online service can guarantee absolute security. Please use a strong password and contact us if you suspect unauthorized account access.
        </p>
      </section>

      <section>
        <h2>7. Data Retention</h2>
        <p className="mt-4">
          We retain information for as long as needed to provide services, comply with legal obligations, resolve disputes, enforce agreements, and maintain financial and audit records.
          You may request account closure or correction of inaccurate profile information by contacting support.
        </p>
      </section>

      <section>
        <h2>8. Your Rights</h2>
        <p className="mt-4">
          Depending on applicable law, you may request access to, correction of, or deletion of certain personal information, subject to legal and operational requirements such as open orders, payouts, or audit logs.
        </p>
      </section>

      <section>
        <h2>9. Cookies</h2>
        <p className="mt-4">
          RashPOD uses cookies and similar technologies to keep you signed in, remember preferences, measure site performance, and protect against abuse.
          You can control cookies through your browser settings, though some features may not work correctly if cookies are disabled.
        </p>
      </section>

      <section>
        <h2>10. Changes to This Policy</h2>
        <p className="mt-4">
          We may update this Privacy Policy from time to time. The latest version will always be posted on this page with an updated date.
        </p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p className="mt-4">
          Privacy questions or data requests can be sent to hello@rashpod.uz, Telegram @rashpod, or +998 50 270 00 00.
        </p>
      </section>
    </LegalPage>
  );
}
