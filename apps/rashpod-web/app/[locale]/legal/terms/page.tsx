import { LegalPage } from "../legal-content";

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions">
      <p>
        Welcome to RashPOD. These Terms &amp; Conditions explain how customers, designers, businesses, and print service buyers can use RashPOD.
        By using our website, creating an account, placing an order, uploading artwork, submitting a custom request, or ordering print-ready films, you agree to these Terms.
      </p>

      <section>
        <h2>1. About RashPOD</h2>
        <p className="mt-4">
          RashPOD is a creative print-on-demand platform based in Uzbekistan. We help customers shop original products, designers sell their artwork,
          businesses request custom printed products, and production teams order print-ready DTF and UV-DTF films.
        </p>
        <p className="mt-4">
          RashPOD may offer products through its own shop and may also publish approved products through partner marketplaces or external sales channels when enabled by platform settings.
        </p>
      </section>

      <section>
        <h2>2. Using RashPOD</h2>
        <p className="mt-4">You agree to use RashPOD only for lawful and respectful purposes. You must not:</p>
        <ul className="mt-4">
          <li>misuse the website or attempt unauthorized access;</li>
          <li>submit false, misleading, or infringing information or files;</li>
          <li>copy, scrape, or resell platform content without permission;</li>
          <li>upload harmful, illegal, or offensive material;</li>
          <li>interfere with production, payments, moderation, or delivery workflows.</li>
        </ul>
        <p className="mt-4">
          RashPOD may suspend or restrict accounts that violate these Terms, applicable law, or community standards.
        </p>
      </section>

      <section>
        <h2>3. Customer Orders</h2>
        <p className="mt-4">
          Customers can purchase products such as apparel, mugs, posters, accessories, and other printed items available in the RashPOD shop, as well as approved DTF and UV-DTF film listings where enabled.
        </p>
        <ul className="mt-4">
          <li>Prices, product availability, and delivery options are shown at checkout and may change as admin settings are updated.</li>
          <li>Many products are made on demand after payment is confirmed, so production time is part of the overall fulfillment timeline.</li>
          <li>Orders are confirmed after successful payment through the configured payment provider (Click in Uzbekistan).</li>
          <li>Order status, production updates, and delivery information are available through your account where applicable.</li>
          <li>Customers are responsible for providing accurate contact details, delivery address, and order selections.</li>
        </ul>
      </section>

      <section>
        <h2>4. Designer Rights &amp; Royalties</h2>
        <p className="mt-4">
          Designers retain ownership of their original artwork unless otherwise agreed in writing. By uploading designs and approving listings, designers grant RashPOD the rights needed to produce, display, sell, and fulfill orders for approved products.
        </p>
        <ul className="mt-4">
          <li>Design approval for product sales does not automatically grant any unrelated commercial rights.</li>
          <li>Designer royalties are calculated according to admin-configurable platform rules and may differ by product type, channel, or listing.</li>
          <li>Designers are responsible for ensuring their uploads are original or properly licensed and do not infringe third-party rights.</li>
          <li>RashPOD may moderate, reject, request changes to, or unpublish designs that do not meet quality, legal, or policy requirements.</li>
          <li>Payout timing and eligibility may depend on verification, order settlement, and platform payout settings.</li>
        </ul>
      </section>

      <section>
        <h2>5. Film Sales (DTF / UV-DTF)</h2>
        <p className="mt-4">
          Film sales are governed by separate designer consent rules. A design approved for product sales is not automatically approved for DTF or UV-DTF film sales.
        </p>
        <ul className="mt-4">
          <li>Designers must explicitly enable film sales per design or version before a film listing can be created.</li>
          <li>Designers may disable film sales for future orders; revocation policies define how existing paid film orders are handled.</li>
          <li>Film listings and orders may require minimum file quality, transparency, resolution, and production readiness checks.</li>
          <li>Film prices, royalties, supported methods, and rush fees may be configured by RashPOD administrators.</li>
          <li>Customers ordering films choose method, size, quantity, and delivery options shown at checkout.</li>
        </ul>
      </section>

      <section>
        <h2>6. Custom &amp; Corporate Orders</h2>
        <p className="mt-4">
          Businesses and organizations may submit custom order requests or corporate briefs for branded products, events, campaigns, and bulk production.
        </p>
        <ul className="mt-4">
          <li>Submitted briefs may be reviewed for feasibility, timing, budget, and production method before a quote or commercial offer is issued.</li>
          <li>Final pricing, scope, timeline, and delivery terms are confirmed in the approved offer or order confirmation.</li>
          <li>Uploaded logos, artwork, and brand files must be provided with appropriate usage rights.</li>
          <li>RashPOD may assign internal production, designer support, or partner fulfillment depending on the request.</li>
        </ul>
      </section>

      <section>
        <h2>7. Payments</h2>
        <p className="mt-4">
          Online payments are processed through RashPOD&apos;s configured payment provider. By placing an order, you authorize RashPOD to charge the total amount shown at checkout, including product price, delivery fees, and applicable charges.
        </p>
        <ul className="mt-4">
          <li>Failed or reversed payments may cancel or delay production.</li>
          <li>Refunds, where applicable, follow the Shipping &amp; Returns policy and order review process.</li>
          <li>Corporate or custom orders may use separate invoicing or payment terms when agreed in writing.</li>
        </ul>
      </section>

      <section>
        <h2>8. Intellectual Property &amp; Content</h2>
        <p className="mt-4">
          RashPOD branding, website content, templates, mockups, and platform tools remain the property of RashPOD or its licensors unless otherwise stated.
          Users must not copy, reverse engineer, or misuse platform assets outside permitted use.
        </p>
      </section>

      <section>
        <h2>9. Limitation of Liability</h2>
        <p className="mt-4">
          RashPOD works to provide reliable production, delivery, and platform services, but does not guarantee uninterrupted access or error-free operation.
          To the extent permitted by law, RashPOD is not liable for indirect, incidental, or consequential losses arising from platform use, third-party delivery providers, or force majeure events.
        </p>
      </section>

      <section>
        <h2>10. Changes to These Terms</h2>
        <p className="mt-4">
          RashPOD may update these Terms from time to time. Material changes will be reflected on this page with an updated date.
          Continued use of the platform after changes are posted constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p className="mt-4">
          Questions about these Terms can be sent to hello@rashpod.uz, Telegram @rashpod, or +998 50 270 00 00.
        </p>
      </section>
    </LegalPage>
  );
}
