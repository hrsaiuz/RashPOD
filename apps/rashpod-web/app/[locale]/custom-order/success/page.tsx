import { DecoratedPanel, StorePage } from "../../storefront-ui";

export default function CustomOrderSuccessPage() {
  return (
    <StorePage>
      <DecoratedPanel dark className="min-h-[520px] px-6 py-20 text-center sm:min-h-[700px] sm:px-10 sm:py-24">
        <div role="status" aria-live="polite" className="mx-auto flex min-h-[360px] max-w-[1040px] flex-col items-center justify-center sm:min-h-[510px]">
        <h1 className="text-2xl font-bold sm:text-[28px]">Thank you! Your custom order request has been submitted.</h1>
        <p className="mx-auto mt-12 max-w-[920px] text-lg leading-relaxed sm:mt-20 sm:text-[26px] sm:leading-[1.8]">
          Our team will review your brief, check the design and production requirements, and get back to you with the next steps.
        </p>
        </div>
      </DecoratedPanel>
    </StorePage>
  );
}
