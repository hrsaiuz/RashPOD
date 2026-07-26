"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Upload } from "lucide-react";
import { cn } from "../lib/utils";
import { MediaImage } from "./MediaImage";

export function MarketingInput({
  label,
  className,
  error,
  id,
  required,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  return (
    <label className={cn("block", className)} htmlFor={inputId}>
      <span className="mb-2 block text-sm font-medium text-brand-ink">
        {label}{required ? <span className="text-semantic-dangerText" aria-hidden="true"> *</span> : null}
      </span>
      <input
        id={inputId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : props["aria-describedby"]}
        {...props}
        className="h-10 w-full min-h-[44px] border-0 border-b border-brand-subtle bg-transparent px-0 text-base text-brand-ink outline-none focus:border-brand-ink focus:ring-0"
      />
      {error ? <span id={errorId} className="mt-2 block text-sm text-semantic-dangerText">{error}</span> : null}
    </label>
  );
}

export function MarketingSelect({
  label,
  children,
  className,
  error,
  id,
  required,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }) {
  const generatedId = React.useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;
  return (
    <label className={cn("block", className)} htmlFor={selectId}>
      <span className="mb-2 block text-sm font-medium text-brand-ink">
        {label}{required ? <span className="text-semantic-dangerText" aria-hidden="true"> *</span> : null}
      </span>
      <select
        id={selectId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : props["aria-describedby"]}
        {...props}
        className="h-10 w-full min-h-[44px] border-0 border-b border-brand-subtle bg-transparent px-0 text-base text-brand-ink outline-none focus:border-brand-ink focus:ring-0"
      >
        {children}
      </select>
      {error ? <span id={errorId} className="mt-2 block text-sm text-semantic-dangerText">{error}</span> : null}
    </label>
  );
}

export function MarketingTextarea({
  label,
  className,
  error,
  id,
  required,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }) {
  const generatedId = React.useId();
  const textareaId = id ?? generatedId;
  const errorId = `${textareaId}-error`;
  return (
    <label className={cn("block", className)} htmlFor={textareaId}>
      <span className="mb-2 block text-sm font-medium text-brand-ink">
        {label}{required ? <span className="text-semantic-dangerText" aria-hidden="true"> *</span> : null}
      </span>
      <textarea
        id={textareaId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : props["aria-describedby"]}
        {...props}
        className="w-full rounded-2xl border border-brand-muted/60 bg-transparent px-4 py-3 text-base text-brand-ink outline-none focus:border-brand-ink focus:ring-0 min-h-[120px]"
      />
      {error ? <span id={errorId} className="mt-2 block text-sm text-semantic-dangerText">{error}</span> : null}
    </label>
  );
}

export function MarketingUploadButton({
  label,
  onChange,
  id,
  required,
  error,
}: {
  label: string;
  onChange: (files: FileList | null) => void;
  id?: string;
  required?: boolean;
  error?: string;
}) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  return (
    <div>
      <label htmlFor={inputId} className="inline-flex min-h-[44px] cursor-pointer items-center gap-4 text-base font-medium text-brand-ink">
        <span>{label}{required ? <span className="text-semantic-dangerText" aria-hidden="true"> *</span> : null}</span>
        <span className="grid h-11 w-11 place-items-center rounded-xs bg-brand-ink text-white">
          <Upload size={20} aria-hidden="true" />
        </span>
      </label>
      <input id={inputId} type="file" multiple className="sr-only" aria-required={required} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} onChange={(e) => onChange(e.target.files)} />
      {error ? <p id={errorId} className="mt-2 text-sm text-semantic-dangerText">{error}</p> : null}
    </div>
  );
}

export function MarketingStepper({ step, total = 4 }: { step: number; total?: number }) {
  return (
    <div className="mx-auto flex w-full max-w-form items-center justify-center" aria-label={`Step ${step} of ${total}`}>
      {Array.from({ length: total }).map((_, index) => {
        const n = index + 1;
        const complete = n < step;
        const active = n === step;
        return (
          <div key={n} className="contents">
            <div
              className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 text-sm sm:h-12 sm:w-12",
                complete && "border-semantic-filmText bg-brand-peach text-brand-ink",
                active && !complete && "border-semantic-filmText bg-transparent text-semantic-filmText",
                !complete && !active && "border-brand-subtle bg-transparent text-brand-subtle"
              )}
            >
              <span className="sr-only">{complete ? `Step ${n} completed` : active ? `Step ${n}, current` : `Step ${n}`}</span>
              {complete ? (
                <Check size={20} />
              ) : (
                <span
                  className={cn(
                    "h-3 w-3 rounded-full",
                    active ? "bg-semantic-filmText" : "bg-brand-subtle"
                  )}
                />
              )}
            </div>
            {n < total ? (
              <div
                className={cn(
                  "h-0.5 min-w-3 flex-1 sm:max-w-20 md:max-w-28",
                  n < step ? "bg-semantic-filmText" : "bg-brand-subtle"
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
  alt,
  fallbackLabel,
  onClick,
}: {
  label: string;
  title: string;
  img?: string | null;
  alt?: string;
  fallbackLabel?: string;
  onClick?: () => void;
}) {
  const content = <><div className="relative z-10"><p className="text-sm font-bold uppercase tracking-[0.1em] text-white/65">{label}</p><h3 className="mt-1 text-3xl font-black lowercase leading-none text-white">{title}</h3></div><MediaImage src={img} alt={alt ?? `RashPOD ${title}`} fallbackLabel={fallbackLabel ?? title} containerClassName="absolute inset-x-5 bottom-4 top-[82px]" className="object-contain transition-transform duration-200 motion-safe:group-hover:scale-[1.03]" loading="lazy" /></>;
  const classes = "group relative min-h-[260px] w-full overflow-hidden rounded-[24px] bg-brand-ink p-5 text-left text-white shadow-soft transition motion-safe:hover:-translate-y-1 hover:shadow-lift focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-peach/35 sm:min-h-[300px] sm:p-6";
  return onClick ? <button type="button" onClick={onClick} className={classes}>{content}</button> : <div className={classes}>{content}</div>;
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
          className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-pill bg-brand-blue px-6 text-base font-bold text-brand-ink transition-colors hover:bg-brand-blueSecondary"
        >
          Shop products
        </Link>
        <Link
          href="/designer-application"
          className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-pill bg-brand-peach px-6 text-base font-bold text-brand-ink transition-colors hover:bg-brand-peachSecondary"
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
