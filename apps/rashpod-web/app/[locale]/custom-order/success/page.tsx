import { DecoratedPanel, StorePage } from "../../storefront-ui";

export default function CustomOrderSuccessPage() {
  return (
    <StorePage>
      <DecoratedPanel dark className="min-h-[700px] px-10 py-24 text-center">
        <h1 className="mt-40 text-[28px] font-bold">Thank you! Your custom order request has been submitted.</h1>
        <p className="mx-auto mt-28 max-w-[1040px] text-[28px] leading-[1.9]">
          Our team will review your brief, check the design and production requirements, and get back to you with the next steps.
        </p>
      </DecoratedPanel>
    </StorePage>
  );
}
