import { LegalPage } from "../legal-content";

export default function ShippingReturnsPage() {
  return (
    <LegalPage title="Shipping & Returns">
      <p>
        This page explains how shipping, delivery, returns, exchanges, and order issues work on RashPOD for product orders, custom orders, and print-ready film orders.
      </p>

      <section>
        <h2>1. Made-on-Demand Products</h2>
        <p className="mt-4">
          Many RashPOD products are made on demand. Your item is printed or prepared after you place and pay for an order.
        </p>
        <p className="mt-4">
          Because of this, delivery includes both production time and courier delivery time. Production time may depend on product type, print method, order quantity, file quality, current workload, and whether the order is standard or rush.
        </p>
      </section>

      <section>
        <h2>2. Order Processing</h2>
        <p className="mt-4">After your order is placed, RashPOD may:</p>
        <ul className="mt-4">
          <li>confirm your payment;</li>
          <li>review artwork, files, or order details;</li>
          <li>prepare the order for production;</li>
          <li>print or produce the product or film;</li>
          <li>complete quality control;</li>
          <li>package the order;</li>
          <li>hand it to the selected delivery provider or prepare it for pickup.</li>
        </ul>
        <p className="mt-4">
          If we need more information from you, we may contact you before production or delivery. Delays caused by missing information, invalid files, or unreachable contact details are not counted as production faults.
        </p>
      </section>

      <section>
        <h2>3. Delivery Providers &amp; Zones</h2>
        <p className="mt-4">RashPOD supports admin-configurable delivery methods, which may include:</p>
        <ul className="mt-4">
          <li>Yandex Delivery for eligible orders inside Tashkent;</li>
          <li>UzPost for nationwide delivery across Uzbekistan where available;</li>
          <li>pickup from the RashPOD workshop or another configured pickup location;</li>
          <li>manual or alternative delivery when configured by RashPOD administrators.</li>
        </ul>
        <p className="mt-4">
          Available methods, zones, and prices are shown at checkout or confirmed in custom order offers. RashPOD may override the delivery provider when required for operational or customer support reasons.
        </p>
      </section>

      <section>
        <h2>4. Delivery Time &amp; Tracking</h2>
        <p className="mt-4">
          Estimated delivery time depends on your location, production workload, product type, and delivery provider availability.
          Any ETA shown on the website or at checkout is an estimate, not a guaranteed arrival time.
        </p>
        <p className="mt-4">
          Tracking numbers and delivery status updates are stored when provided by the courier or pickup workflow. You can review order status in your RashPOD account where available.
        </p>
      </section>

      <section>
        <h2>5. Delivery Costs</h2>
        <p className="mt-4">
          Delivery fees are calculated according to platform settings and may vary by zone, provider, order value, and product type.
          Free delivery thresholds may apply to eligible methods when enabled in admin delivery settings.
        </p>
      </section>

      <section>
        <h2>6. Pickup Orders</h2>
        <p className="mt-4">
          If pickup is selected, you will receive instructions when the order is ready. Pickup address and hours are configured by RashPOD and may change over time.
          Orders not collected within the communicated pickup window may require rebooking or additional handling.
        </p>
      </section>

      <section>
        <h2>7. Returns &amp; Exchanges</h2>
        <p className="mt-4">
          Because many RashPOD items are custom-made or printed on demand, standard change-of-mind returns may not be available once production has started.
        </p>
        <ul className="mt-4">
          <li>Please review product details, size, color, and delivery information carefully before checkout.</li>
          <li>Exchanges or returns may be considered when an item arrives damaged, defective, materially different from what was ordered, or fails quality standards.</li>
          <li>Requests should be submitted promptly with your order number, photos, and a clear description of the issue.</li>
          <li>Approved resolutions may include reprint, replacement, partial refund, or full refund depending on the case.</li>
        </ul>
      </section>

      <section>
        <h2>8. Defective, Damaged, or Incorrect Items</h2>
        <p className="mt-4">
          If you receive a defective, damaged, or incorrect product, contact RashPOD customer support as soon as possible.
          We may request photos of the item, packaging, and print area before approving a remake, exchange, or refund.
        </p>
      </section>

      <section>
        <h2>9. Film Orders</h2>
        <p className="mt-4">
          DTF and UV-DTF film orders are production files prepared for printing or transfer use. Because films are made to order from approved design files,
          returns for change of mind are generally not accepted once production begins.
        </p>
        <p className="mt-4">
          If a film order has a verified production defect, file mismatch, or delivery issue, RashPOD will review the case and may offer reprint, correction, or refund according to platform policy.
        </p>
      </section>

      <section>
        <h2>10. Custom &amp; Corporate Orders</h2>
        <p className="mt-4">
          Custom and corporate orders follow the delivery terms confirmed in the approved quote or commercial offer.
          Changes, cancellations, and return eligibility may depend on whether production, design work, or materials have already started.
        </p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p className="mt-4">
          For delivery, return, or order issue questions, contact hello@rashpod.uz, Telegram @therashpod, or +998 50 270 00 00 with your order number and details.
        </p>
      </section>
    </LegalPage>
  );
}
