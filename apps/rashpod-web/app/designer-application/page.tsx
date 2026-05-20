"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Stepper, StorePage, UnderlineInput, UnderlineSelect, UnderlineTextarea, UploadButton } from "../storefront-ui";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  telegramUsername: string;
  password: string;
  confirmPassword: string;
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

const initial: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phoneCountryCode: "+1",
  phoneNumber: "",
  telegramUsername: "",
  password: "",
  confirmPassword: "",
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
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/proxy/intake/designer-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        passwordProvided: Boolean(form.password),
        password: undefined,
        confirmPassword: undefined,
        designCategories: form.designCategories ? [form.designCategories] : [],
      }),
    });
    if (res.ok) router.push("/designer-application/success");
    else {
      setError("Could not submit application. Please check the required fields and try again.");
      setSubmitting(false);
    }
  }

  return (
    <StorePage>
      <h1 className="text-[30px] font-bold text-black">Apply as a Designer</h1>
      <p className="mt-7 text-[24px] text-black">Tell us about yourself, your creative work, and the type of products you want to create on RashPOD.</p>

      <form onSubmit={submit} className="mt-14 rounded-[32px] border border-[#5F6067] bg-brand-bg p-10 lg:p-16">
        <Stepper step={step} />
        <div className="mt-16 min-h-[590px]">
          {step === 1 ? (
            <section>
              <h2 className="text-[18px] font-medium text-black">Account information</h2>
              <p className="mt-3 text-[13px] text-black">We’ll use this information to contact you about your application.</p>
              <div className="mt-12 grid max-w-[760px] gap-x-24 gap-y-8 md:grid-cols-2">
                <UnderlineInput label="First Name" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                <UnderlineInput label="Last Name" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                <UnderlineInput label="Email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <UnderlineInput label="Phone Number" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
                <UnderlineInput label="Telegram username" value={form.telegramUsername} onChange={(e) => setForm({ ...form, telegramUsername: e.target.value })} />
                <div />
                <UnderlineInput label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <UnderlineInput label="Confirm password" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section>
              <h2 className="text-[18px] font-medium text-black">Designer profile</h2>
              <p className="mt-3 text-[13px] text-black">This information helps us understand your style and creative background.</p>
              <div className="mt-12 grid max-w-[760px] gap-x-24 gap-y-8 md:grid-cols-2">
                <UnderlineInput label="Display name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
                <UnderlineInput label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                <UnderlineSelect label="Design categories" value={form.designCategories} onChange={(e) => setForm({ ...form, designCategories: e.target.value })}>
                  <option value="">Choose category</option>
                  <option>Apparel</option>
                  <option>Illustration</option>
                  <option>Posters</option>
                  <option>Pattern design</option>
                </UnderlineSelect>
                <UnderlineInput label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <UnderlineTextarea className="mt-10 max-w-[760px]" label="Short bio" rows={4} placeholder="Tell us about your creative background, design style, and the kind of work you create." value={form.shortBio} onChange={(e) => setForm({ ...form, shortBio: e.target.value })} />
              <div className="mt-12">
                <UploadButton label="Upload Portfolio" onChange={(files) => setForm({ ...form, portfolioFiles: names(files).map((file) => file.name) })} />
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section>
              <h2 className="text-[18px] font-medium text-black">Verification and artwork rights</h2>
              <p className="mt-3 text-[13px] text-black">To protect designers, customers, and RashPOD, we review identity and artwork ownership before approval.</p>
              <div className="mt-14 space-y-12">
                <UploadButton label="Upload identity document" onChange={(files) => setForm({ ...form, identityFiles: names(files).map((file) => file.name) })} />
                <UploadButton label="Selfie verification" onChange={(files) => setForm({ ...form, selfieFiles: names(files).map((file) => file.name) })} />
              </div>
              <div className="mt-16 space-y-6">
                {[
                  ["ownWork", "I confirm that the portfolio and artwork I submit are my own work or I have the legal right to use them commercially."],
                  ["noProhibitedContent", "I understand that copied artwork, brand logos, copyrighted characters, celebrity images, and protected content are not allowed."],
                  ["noApprovalGuarantee", "I understand that creating an account does not guarantee approval as a RashPOD designer."],
                  ["terms", "I agree to RashPOD Designer Terms and Privacy Policy."],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-start gap-4 text-[17px] text-black">
                    <input type="checkbox" className="mt-1 h-7 w-7 accent-brand-peach" checked={form.confirmations[key]} onChange={(e) => setForm({ ...form, confirmations: { ...form.confirmations, [key]: e.target.checked } })} />
                    {label}
                  </label>
                ))}
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
                  <div key={label} className="border-b border-[#8E8E94] pb-3">
                    <p className="text-[15px] text-[#8E8E94]">{label}</p>
                    <p className="mt-4 min-h-6 text-[20px] text-[#07172D]">{value || "—"}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
        {error ? <p className="text-red-600">{error}</p> : null}
        <div className="flex justify-between gap-4">
          {step > 1 ? <button type="button" onClick={() => setStep(step - 1)} className="h-[68px] rounded-[18px] border border-brand-peach px-10 text-[20px] font-bold text-brand-peach">Back</button> : <span />}
          <button disabled={submitting} className="h-[78px] rounded-[22px] bg-brand-peach px-10 text-[24px] font-bold text-white">
            {step === 3 ? "Review application" : step === 4 ? (submitting ? "Submitting..." : "Submit application") : "Continue"}
          </button>
        </div>
      </form>
    </StorePage>
  );
}
