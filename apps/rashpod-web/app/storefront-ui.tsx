import Link from "next/link";
import { Check, Upload } from "lucide-react";

export function StorePage({ children, narrow = false }: { children: React.ReactNode; narrow?: boolean }) {
  return <div className={`${narrow ? "max-w-[1180px]" : "max-w-[1360px]"} mx-auto px-6 py-16`}>{children}</div>;
}

export function UnderlineInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, className = "", ...rest } = props;
  return (
    <label className={`block ${className}`}>
      <span className="mb-3 block text-[15px] font-medium text-black">{label}</span>
      <input
        {...rest}
        className="h-10 w-full border-0 border-b border-[#8E8E94] bg-transparent px-0 text-[18px] text-[#07172D] outline-none focus:border-[#07172D] focus:ring-0"
      />
    </label>
  );
}

export function UnderlineSelect(props: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const { label, children, className = "", ...rest } = props;
  return (
    <label className={`block ${className}`}>
      <span className="mb-3 block text-[15px] font-medium text-black">{label}</span>
      <select
        {...rest}
        className="h-10 w-full border-0 border-b border-[#8E8E94] bg-transparent px-0 text-[18px] text-[#07172D] outline-none focus:border-[#07172D] focus:ring-0"
      >
        {children}
      </select>
    </label>
  );
}

export function UnderlineTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const { label, className = "", ...rest } = props;
  return (
    <label className={`block ${className}`}>
      <span className="mb-3 block text-[15px] font-medium text-black">{label}</span>
      <textarea
        {...rest}
        className="w-full rounded-[18px] border border-[#5F6067] bg-transparent px-4 py-4 text-[16px] text-[#07172D] outline-none focus:border-[#07172D] focus:ring-0"
      />
    </label>
  );
}

export function UploadButton({ label, onChange }: { label: string; onChange: (files: FileList | null) => void }) {
  return (
    <label className="inline-flex items-center gap-5 text-[17px] font-medium text-black">
      <span>{label}</span>
      <input type="file" multiple className="hidden" onChange={(e) => onChange(e.target.files)} />
      <span className="grid h-11 w-11 cursor-pointer place-items-center rounded-[8px] bg-[#344054] text-white">
        <Upload size={20} aria-hidden="true" />
      </span>
    </label>
  );
}

export function Stepper({ step, total = 4 }: { step: number; total?: number }) {
  return (
    <div className="mx-auto flex max-w-[720px] items-center justify-center">
      {Array.from({ length: total }).map((_, index) => {
        const n = index + 1;
        const complete = n < step;
        const active = n === step;
        return (
          <div key={n} className="contents">
            <div
              className={`grid h-12 w-12 place-items-center rounded-full border-2 text-sm ${
                complete
                  ? "border-brand-peach bg-brand-peach text-white"
                  : active
                    ? "border-brand-peach bg-transparent text-brand-peach"
                    : "border-[#868686] bg-transparent text-[#868686]"
              }`}
            >
              {complete ? <Check size={22} /> : <span className={`h-3 w-3 rounded-full ${active ? "bg-brand-peach" : "bg-[#868686]"}`} />}
            </div>
            {n < total ? <div className={`h-[2px] w-28 ${n < step ? "bg-brand-peach" : "bg-[#868686]"}`} /> : null}
          </div>
        );
      })}
    </div>
  );
}

export function DecoratedPanel({
  children,
  dark = false,
  className = "",
}: {
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <section className={`relative overflow-hidden rounded-[28px] ${dark ? "bg-[#313238] text-white" : "bg-brand-peachLight text-black"} ${className}`}>
      <span className="absolute -left-12 -top-12 h-44 w-44 rounded-br-[90px] bg-brand-blueLight" />
      <span className="absolute right-16 top-14 h-24 w-24 rounded-full border-[6px] border-brand-blue opacity-90" />
      <span className="absolute bottom-0 right-0 h-44 w-44 rotate-45 rounded-[40px] bg-brand-peach" />
      <span className="absolute bottom-10 left-20 h-28 w-28 rounded-full border-[18px] border-brand-blue" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export function ProductTypeTile({ label, title, img }: { label: string; title: string; img?: string }) {
  return (
    <div className="relative min-h-[236px] overflow-hidden rounded-[14px] bg-[#313238] p-6 text-white">
      <p className="text-[22px] font-bold lowercase text-white/80">{label}</p>
      <h3 className="text-[34px] font-black lowercase leading-none">{title}</h3>
      {img ? <img src={img} alt="" className="absolute bottom-5 right-5 max-h-[140px] max-w-[170px] object-contain" /> : null}
    </div>
  );
}

export function SimpleCta() {
  return (
    <div className="mt-14 text-center">
      <h2 className="text-[20px] font-bold text-black">Create with RashPOD</h2>
      <p className="mx-auto mt-8 max-w-[760px] text-[16px] text-black">
        Whether you want to shop, sell, customize, or produce, RashPOD helps bring creative ideas into real products.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-36">
        <Link href="/shop" className="inline-flex h-[54px] min-w-[188px] items-center justify-center rounded-[16px] bg-brand-blue px-8 text-[16px] font-bold text-white">
          Shop products
        </Link>
        <Link href="/sell-on-rashpod" className="inline-flex h-[54px] min-w-[188px] items-center justify-center rounded-[16px] bg-brand-peach px-8 text-[16px] font-bold text-white">
          Start selling
        </Link>
      </div>
    </div>
  );
}
