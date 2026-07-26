"use client";

import { FormEvent, useState } from "react";
import { uploadIntakeFiles } from "../../../lib/intake-upload";
import { useRouter } from "../../../i18n/navigation";
import { Stepper, StorePage, UnderlineInput, UnderlineSelect, UnderlineTextarea, UploadButton } from "../storefront-ui";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  telegramUsername: string;
  displayName: string;
  country: string;
  city: string;
  designCategories: string;
  shortBio: string;
  portfolioFiles: string[];
  identityFiles: string[];
  selfieFiles: string[];
  confirmations: Record<string, boolean>;
};

type FieldName =
  | "firstName"
  | "lastName"
  | "email"
  | "displayName"
  | "country"
  | "city"
  | "designCategories"
  | "shortBio"
  | "portfolio"
  | "identity"
  | "selfie"
  | "agreements";

type FieldErrors = Partial<Record<FieldName, string>>;

const initial: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phoneCountryCode: "+998",
  phoneNumber: "",
  telegramUsername: "",
  displayName: "",
  country: "",
  city: "",
  designCategories: "",
  shortBio: "",
  portfolioFiles: [],
  identityFiles: [],
  selfieFiles: [],
  confirmations: { ownWork: false, noProhibitedContent: false, noApprovalGuarantee: false, terms: false },
};

function names(files: FileList | null) {
  return files ? Array.from(files).map((file) => ({ name: file.name, size: file.size, type: file.type })) : [];
}

export default function DesignerApplicationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [identityFiles, setIdentityFiles] = useState<File[]>([]);
  const [selfieFiles, setSelfieFiles] = useState<File[]>([]);

  function clearFieldError(field: FieldName) {
    setError("");
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function showValidationErrors(errors: FieldErrors, targetStep = step) {
    setFieldErrors(errors);
    setError("Please correct the highlighted fields before continuing.");
    if (targetStep !== step) setStep(targetStep);
    const firstField = Object.keys(errors)[0];
    if (firstField) window.setTimeout(() => document.getElementById(firstField)?.focus(), 0);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (step < 4) {
      const stepErrors = validateStep(step);
      if (Object.keys(stepErrors).length) {
        showValidationErrors(stepErrors);
        return;
      }
      setError("");
      setFieldErrors({});
      setStep(step + 1);
      return;
    }
    const finalErrors = { ...validateStep(1), ...validateStep(2), ...validateStep(3) };
    if (Object.keys(finalErrors).length) {
      const firstStep = Object.keys(validateStep(1)).length ? 1 : Object.keys(validateStep(2)).length ? 2 : 3;
      showValidationErrors(finalErrors, firstStep);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const [portfolioUploads, identityUploads, selfieUploads] = await Promise.all([
        uploadIntakeFiles(portfolioFiles, "DESIGNER_PORTFOLIO"),
        uploadIntakeFiles(identityFiles, "DESIGNER_IDENTITY"),
        uploadIntakeFiles(selfieFiles, "DESIGNER_SELFIE"),
      ]);

      const res = await fetch("/api/proxy/intake/designer-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          passwordProvided: false,
          designCategories: form.designCategories ? [form.designCategories] : [],
          portfolioFiles: portfolioUploads,
          identityFiles: identityUploads,
          selfieFiles: selfieUploads,
        }),
      });
      if (res.ok) router.push("/designer-application/success");
      else setError("Could not submit application. Please check the required fields and try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload files or submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  function validateStep(currentStep: number): FieldErrors {
    const errors: FieldErrors = {};
    if (currentStep === 1) {
      if (!form.firstName.trim()) errors.firstName = "Enter your first name.";
      if (!form.lastName.trim()) errors.lastName = "Enter your last name.";
      if (!form.email.trim()) errors.email = "Enter your email address.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email address.";
    }
    if (currentStep === 2) {
      if (!form.displayName.trim()) errors.displayName = "Enter the name customers will see.";
      if (!form.country.trim()) errors.country = "Enter your country.";
      if (!form.city.trim()) errors.city = "Enter your city.";
      if (!form.designCategories) errors.designCategories = "Choose a design category.";
      if (form.shortBio.trim().length < 20) errors.shortBio = "Write at least 20 characters about your creative background.";
      if (portfolioFiles.length === 0) errors.portfolio = "Upload at least one portfolio file.";
    }
    if (currentStep === 3) {
      if (identityFiles.length === 0) errors.identity = "Upload an identity document.";
      if (selfieFiles.length === 0) errors.selfie = "Upload a verification selfie.";
      if (!Object.values(form.confirmations).every(Boolean)) errors.agreements = "Accept all required designer agreements.";
    }
    return errors;
  }

  return (
    <StorePage>
      <h1 className="text-3xl font-bold text-black sm:text-h1">Apply as a Designer</h1>
      <p className="mt-4 max-w-[900px] text-lg leading-relaxed text-black sm:mt-6 sm:text-xl">Tell us about yourself, your creative work, and the type of products you want to create on RashPOD.</p>

      <form noValidate onSubmit={submit} className="mt-8 rounded-2xl border border-brand-muted/60 bg-brand-bg p-5 sm:mt-12 sm:p-10 lg:p-16">
        <Stepper step={step} />
        {error ? <p role="alert" className="mt-6 rounded-md bg-semantic-dangerBg p-4 text-sm text-semantic-dangerText">{error}</p> : null}
        <div className="mt-10 md:min-h-[520px]">
          {step === 1 ? (
            <section>
              <h2 className="text-[18px] font-medium text-black">Account information</h2>
              <p className="mt-3 text-[13px] text-black">We’ll use this information to contact you about your application.</p>
              <div className="mt-10 grid max-w-[760px] gap-x-24 gap-y-8 md:grid-cols-2">
                <UnderlineInput id="firstName" label="First Name" required autoComplete="given-name" error={fieldErrors.firstName} value={form.firstName} onChange={(e) => { clearFieldError("firstName"); setForm({ ...form, firstName: e.target.value }); }} />
                <UnderlineInput id="lastName" label="Last Name" required autoComplete="family-name" error={fieldErrors.lastName} value={form.lastName} onChange={(e) => { clearFieldError("lastName"); setForm({ ...form, lastName: e.target.value }); }} />
                <UnderlineInput id="email" label="Email" required type="email" autoComplete="email" error={fieldErrors.email} value={form.email} onChange={(e) => { clearFieldError("email"); setForm({ ...form, email: e.target.value }); }} />
                <UnderlineInput id="phoneNumber" label="Phone Number" type="tel" autoComplete="tel" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
                <UnderlineInput id="telegramUsername" label="Telegram username" autoComplete="off" value={form.telegramUsername} onChange={(e) => setForm({ ...form, telegramUsername: e.target.value })} />
                <div />
                <p className="md:col-span-2 rounded-2xl bg-brand-blueLight/35 p-4 text-sm text-brand-ink">
                  You will create your password from a secure invitation after the application is approved.
                </p>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section>
              <h2 className="text-[18px] font-medium text-black">Designer profile</h2>
              <p className="mt-3 text-[13px] text-black">This information helps us understand your style and creative background.</p>
              <div className="mt-10 grid max-w-[760px] gap-x-24 gap-y-8 md:grid-cols-2">
                <UnderlineInput id="displayName" label="Display name" required autoComplete="nickname" error={fieldErrors.displayName} value={form.displayName} onChange={(e) => { clearFieldError("displayName"); setForm({ ...form, displayName: e.target.value }); }} />
                <UnderlineInput id="country" label="Country" required autoComplete="country-name" error={fieldErrors.country} value={form.country} onChange={(e) => { clearFieldError("country"); setForm({ ...form, country: e.target.value }); }} />
                <UnderlineSelect id="designCategories" label="Design categories" required error={fieldErrors.designCategories} value={form.designCategories} onChange={(e) => { clearFieldError("designCategories"); setForm({ ...form, designCategories: e.target.value }); }}>
                  <option value="">Choose category</option>
                  <option>Apparel</option>
                  <option>Illustration</option>
                  <option>Posters</option>
                  <option>Pattern design</option>
                </UnderlineSelect>
                <UnderlineInput id="city" label="City" required autoComplete="address-level2" error={fieldErrors.city} value={form.city} onChange={(e) => { clearFieldError("city"); setForm({ ...form, city: e.target.value }); }} />
              </div>
              <UnderlineTextarea id="shortBio" className="mt-10 max-w-[760px]" label="Short bio" required error={fieldErrors.shortBio} rows={4} placeholder="Tell us about your creative background, design style, and the kind of work you create." value={form.shortBio} onChange={(e) => { clearFieldError("shortBio"); setForm({ ...form, shortBio: e.target.value }); }} />
              <div className="mt-10">
                <UploadButton
                  id="portfolio"
                  label="Upload Portfolio"
                  required
                  error={fieldErrors.portfolio}
                  onChange={(files) => {
                    clearFieldError("portfolio");
                    setForm({ ...form, portfolioFiles: names(files).map((file) => file.name) });
                    setPortfolioFiles(files ? Array.from(files) : []);
                  }}
                />
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section>
              <h2 className="text-[18px] font-medium text-black">Verification and artwork rights</h2>
              <p className="mt-3 text-[13px] text-black">To protect designers, customers, and RashPOD, we review identity and artwork ownership before approval.</p>
              <div className="mt-10 space-y-10">
                <UploadButton
                  id="identity"
                  label="Upload identity document"
                  required
                  error={fieldErrors.identity}
                  onChange={(files) => {
                    clearFieldError("identity");
                    setForm({ ...form, identityFiles: names(files).map((file) => file.name) });
                    setIdentityFiles(files ? Array.from(files) : []);
                  }}
                />
                <UploadButton
                  id="selfie"
                  label="Selfie verification"
                  required
                  error={fieldErrors.selfie}
                  onChange={(files) => {
                    clearFieldError("selfie");
                    setForm({ ...form, selfieFiles: names(files).map((file) => file.name) });
                    setSelfieFiles(files ? Array.from(files) : []);
                  }}
                />
              </div>
              <div className="mt-12 space-y-6" aria-describedby={fieldErrors.agreements ? "agreements-error" : undefined}>
                {[
                  ["ownWork", "I confirm that the portfolio and artwork I submit are my own work or I have the legal right to use them commercially."],
                  ["noProhibitedContent", "I understand that copied artwork, brand logos, copyrighted characters, celebrity images, and protected content are not allowed."],
                  ["noApprovalGuarantee", "I understand that creating an account does not guarantee approval as a RashPOD designer."],
                  ["terms", "I agree to RashPOD Designer Terms and Privacy Policy."],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-start gap-4 text-[17px] text-black">
                    <input id={key === "ownWork" ? "agreements" : undefined} type="checkbox" required className="mt-1 h-7 w-7 shrink-0 accent-brand-peach" checked={form.confirmations[key]} onChange={(e) => { clearFieldError("agreements"); setForm({ ...form, confirmations: { ...form.confirmations, [key]: e.target.checked } }); }} />
                    {label}
                  </label>
                ))}
                {fieldErrors.agreements ? <p id="agreements-error" className="text-sm text-semantic-dangerText">{fieldErrors.agreements}</p> : null}
              </div>
            </section>
          ) : null}

          {step === 4 ? (
            <section>
              <h2 className="text-[18px] font-medium text-black">Review your application</h2>
              <p className="mt-3 text-[13px] text-black">Please check your information before submitting your application.</p>
              <div className="mt-12 grid max-w-[760px] gap-x-24 gap-y-9 md:grid-cols-2">
                {[
                  ["First Name", form.firstName],
                  ["Last name", form.lastName],
                  ["Email", form.email],
                  ["Phone Number", `${form.phoneCountryCode} ${form.phoneNumber}`],
                  ["Telegram username", form.telegramUsername],
                  ["Display name", form.displayName],
                  ["Country", form.country],
                  ["City", form.city],
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-brand-subtle pb-3">
                    <p className="text-[15px] text-brand-subtle">{label}</p>
                    <p className="mt-4 min-h-6 text-[20px] text-brand-ink">{value || "—"}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
        <div className="mt-10 flex justify-between gap-4">
          {step > 1 ? <button type="button" onClick={() => { setError(""); setFieldErrors({}); setStep(step - 1); }} className="inline-flex h-12 items-center justify-center rounded-pill border border-semantic-filmText px-6 text-base font-bold text-semantic-filmText transition-colors hover:bg-brand-peachLight sm:px-8">Back</button> : <span />}
          <button disabled={submitting} className="inline-flex h-12 items-center justify-center rounded-pill bg-brand-peach px-6 text-base font-bold text-brand-ink transition-colors hover:bg-brand-peachSecondary disabled:cursor-not-allowed disabled:opacity-50 sm:px-8">
            {step === 3 ? "Review application" : step === 4 ? (submitting ? "Submitting..." : "Submit application") : "Continue"}
          </button>
        </div>
      </form>
    </StorePage>
  );
}
