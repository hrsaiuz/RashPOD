"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Upload } from "lucide-react";
import { cn } from "../lib/utils";

export function MarketingInput({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 block text-sm font-medium text-brand-ink">{label}</span>
      <input
        {...props}
        className="h-10 w-full min-h-[44px] border-0 border-b border-brand-subtle bg-transparent px-0 text-base text-brand-ink outline-none focus:border-brand-ink focus:ring-0"
      />
    </label>
  );
}

export function MarketingSelect({
  label,
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 block text-sm font-medium text-brand-ink">{label}</span>
      <select
        {...props}
        className="h-10 w-full min-h-[44px] border-0 border-b border-brand-subtle bg-transparent px-0 text-base text-brand-ink outline-none focus:border-brand-ink focus:ring-0"
      >
        {children}
      </select>
    </label>
  );
}

export function MarketingTextarea({
  label,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 block text-sm font-medium text-brand-ink">{label}</span>
      <textarea
        {...props}
        className="w-full rounded-2xl border border-brand-muted/60 bg-transparent px-4 py-3 text-base text-brand-ink outline-none focus:border-brand-ink focus:ring-0 min-h-[120px]"
      />
    </label>
  );
}

export function MarketingUploadButton({
  label,
  onChange,
}: {
  label: string;
  onChange: (files: FileList | null) => void;
}) {
  return (
    <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-4 text-base font-medium text-brand-ink">
      <span>{label}</span>
      <input type="file" multiple className="hidden" onChange={(e) => onChange(e.target.files)} />
      <span className="grid h-11 w-11 place-items-center rounded-xs bg-brand-ink text-white">
        <Upload size={20} aria-hidden="true" />
      </span>
    </label>
  );
}

export function MarketingStepper({ step, total = 4 }: { step: number; total?: number }) {
  return (
    <div className="mx-auto flex max-w-form items-center justify-center overflow-x-auto px-2">
      {Array.from({ length: total }).map((_, index) => {
        const n = index + 1;
        const complete = n < step;
        const active = n === step;
        return (
          <div key={n} className="contents">
            <div
              className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 text-sm sm:h-12 sm:w-12",
                complete && "border-brand-peach bg-brand-peach text-white",
                active && !complete && "border-brand-peach bg-transparent text-brand-peach",
                !complete && !active && "border-brand-subtle bg-transparent text-brand-subtle"
              )}
            >
              {complete ? (
                <Check size={20} />
              ) : (
                <span
                  className={cn(
                    "h-3 w-3 rounded-full",
                    active ? "bg-brand-peach" : "bg-brand-subtle"
                  )}
                />
              )}
            </div>
            {n < total ? (
              <div
                className={cn(
                  "h-0.5 w-12 shrink-0 sm:w-20 md:w-28",
                  n < step ? "bg-brand-peach" : "bg-brand-subtle"
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function MarketingDecoratedPanel({
  children,
  dark = false,
  className,
}: {
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-product",
        dark ? "bg-brand-ink text-white" : "bg-brand-peachLight text-brand-ink",
        className
      )}
    >
      <span className="absolute -left-12 -top-12 h-44 w-44 rounded-br-[90px] bg-brand-blueLight" aria-hidden="true" />
      <span className="absolute right-16 top-14 h-24 w-24 rounded-full border-[6px] border-brand-blue opacity-90" aria-hidden="true" />
      <span className="absolute bottom-0 right-0 h-44 w-44 rotate-45 rounded-[40px] bg-brand-peach" aria-hidden="true" />
      <span className="absolute bottom-10 left-20 h-28 w-28 rounded-full border-[18px] border-brand-blue" aria-hidden="true" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export function MarketingProductTypeTile({
  label,
  title,
  img,
}: {
  label: string;
  title: string;
  img?: string;
}) {
  return (
    <div className="relative min-h-[200px] overflow-hidden rounded-md bg-brand-ink p-5 text-white sm:min-h-[236px] sm:p-6">
      <p className="text-lg font-bold lowercase text-white/80 sm:text-h3">{label}</p>
      <h3 className="text-2xl font-black lowercase leading-none sm:text-h2">{title}</h3>
      {img ? (
        <img src={img} alt="" className="absolute bottom-4 right-4 max-h-[120px] max-w-[140px] object-contain sm:max-h-[140px] sm:max-w-[170px]" />
      ) : null}
    </div>
  );
}

export function MarketingSimpleCta() {
  return (
    <div className="mt-10 text-center md:mt-14">
      <h2 className="text-section font-bold text-brand-ink">Create with RashPOD</h2>
      <p className="mx-auto mt-4 max-w-content text-body text-brand-ink md:mt-6">
        Whether you want to shop, sell, customize, or produce, RashPOD helps bring creative ideas into real products.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6 md:mt-10">
        <Link
          href="/shop"
          className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-md bg-brand-blue px-6 text-base font-bold text-white transition-colors hover:bg-brand-blueSecondary"
        >
          Shop products
        </Link>
        <Link
          href="/sell-on-rashpod"
          className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-md bg-brand-peach px-6 text-base font-bold text-white transition-colors hover:opacity-90"
        >
          Start selling
        </Link>
      </div>
    </div>
  );
}

// Backward-compatible aliases
export const UnderlineInput = MarketingInput;
export const UnderlineSelect = MarketingSelect;
export const UnderlineTextarea = MarketingTextarea;
export const UploadButton = MarketingUploadButton;
export const Stepper = MarketingStepper;
export const DecoratedPanel = MarketingDecoratedPanel;
export const ProductTypeTile = MarketingProductTypeTile;
export const SimpleCta = MarketingSimpleCta;
