import { DecoratedPanel, StorePage } from "../../storefront-ui";

export default function DesignerApplicationSuccessPage() {
  return (
    <StorePage>
      <DecoratedPanel className="min-h-[720px] px-8 py-16 text-center">
        <div className="mx-auto mb-32 flex max-w-[720px] items-center justify-between">
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className="grid h-12 w-12 place-items-center rounded-full bg-brand-peach text-white">✓</span>
          ))}
        </div>
        <h1 className="text-[28px] font-bold">Application submitted</h1>
        <p className="mx-auto mt-28 max-w-[920px] text-[28px] leading-[1.9]">
          Thank you for applying to become a RashPOD designer. Our team will review your profile, portfolio, and submitted information.
        </p>
        <p className="mx-auto mt-24 max-w-[900px] text-[16px]">
          If your application matches RashPOD’s quality and originality standards, we’ll contact you with the next steps.
        </p>
      </DecoratedPanel>
    </StorePage>
  );
}
