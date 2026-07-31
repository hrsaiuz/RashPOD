import { Check } from "lucide-react";
import { DecoratedPanel, StorePage } from "../../storefront-ui";

export default function DesignerApplicationSuccessPage() {
  return (
    <StorePage>
      <DecoratedPanel className="px-5 py-12 text-center sm:px-8 sm:py-16">
        <div className="relative mx-auto mb-12 flex max-w-[520px] items-center justify-between sm:mb-16">
          <span className="absolute left-5 right-5 top-1/2 h-0.5 -translate-y-1/2 bg-brand-peach" aria-hidden="true" />
          {[1, 2, 3, 4].map((step) => (
            <span key={step} className="relative z-10 grid h-11 w-11 place-items-center rounded-full border-2 border-brand-peach bg-brand-peach text-white" aria-label={`Step ${step} completed`}>
              <Check size={20} aria-hidden="true" />
            </span>
          ))}
        </div>
        <div role="status" aria-live="polite">
          <h1 className="text-2xl font-bold sm:text-h2">Application submitted</h1>
          <p className="mx-auto mt-8 max-w-[720px] text-lg leading-relaxed sm:mt-10 sm:text-xl">
            Thank you for applying to become a RashPOD designer. Our team will review your profile, portfolio, and submitted information.
          </p>
          <p className="mx-auto mt-6 max-w-[720px] text-base leading-relaxed sm:mt-8">
            If your application matches RashPOD&apos;s quality and originality standards, we&apos;ll email you a secure invitation with the next steps.
          </p>
        </div>
      </DecoratedPanel>
    </StorePage>
  );
}
