import { DecoratedPanel, StorePage } from "../../storefront-ui";
import { Check } from "lucide-react";

export default function DesignerApplicationSuccessPage() {
  return (
    <StorePage>
      <DecoratedPanel className="px-5 py-12 text-center sm:px-8 sm:py-16">
        <div className="mx-auto mb-12 flex max-w-[520px] items-center justify-between sm:mb-16">
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className="grid h-11 w-11 place-items-center rounded-full border-2 border-semantic-filmText bg-brand-peach text-brand-ink" aria-label={`Step ${n} completed`}>
              <Check size={20} aria-hidden="true" />
            </span>
          ))}
        </div>
        <h1 className="text-2xl font-bold sm:text-h2">Application submitted</h1>
        <p className="mx-auto mt-8 max-w-[720px] text-lg leading-relaxed sm:mt-10 sm:text-xl">
          Thank you for applying to become a RashPOD designer. Our team will review your profile, portfolio, and submitted information.
        </p>
        <p className="mx-auto mt-6 max-w-[720px] text-base leading-relaxed sm:mt-8">
          If approved, we’ll email you a secure invitation to create your password and activate your designer account. Submitting this form does not create an active account.
        </p>
      </DecoratedPanel>
    </StorePage>
  );
}
