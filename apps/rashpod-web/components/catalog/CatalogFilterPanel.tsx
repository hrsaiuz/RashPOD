"use client";

import { Search } from "lucide-react";

export type CatalogCategory = { id: string; name: string; slug: string; category: string };
export type CatalogDesigner = { handle: string; displayName: string };

type Props = {
  search: string;
  onSearch: (value: string) => void;
  sort: string;
  onSort: (value: string) => void;
  categories: CatalogCategory[];
  selectedCategories: string[];
  onCategories: (value: string[]) => void;
  designers?: CatalogDesigner[];
  selectedDesigners?: string[];
  onDesigners?: (value: string[]) => void;
  priceMin?: string;
  priceMax?: string;
  onPrice?: (min: string, max: string) => void;
  hasFilm?: boolean;
  onHasFilm?: (value: boolean) => void;
  activeCount: number;
  onReset: () => void;
  labels: Record<string, string>;
};

export function CatalogFilterPanel(props: Props) {
  return (
    <div className="divide-y divide-surface-borderSoft">
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-lg font-bold text-brand-ink">{props.labels.filters}</h2>
        <button type="button" onClick={props.onReset} disabled={!props.activeCount} className="min-h-11 text-sm font-semibold text-brand-blue disabled:cursor-not-allowed disabled:opacity-40">
          {props.labels.reset}
        </button>
      </div>

      <FilterSection label={props.labels.search}>
        <label className="relative block">
          <Search aria-hidden="true" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
          <span className="sr-only">{props.labels.search}</span>
          <input type="search" value={props.search} onChange={(event) => props.onSearch(event.target.value)} placeholder={props.labels.searchPlaceholder} className={inputClassName + " pl-10"} />
        </label>
      </FilterSection>

      <FilterSection label={props.labels.sort}>
        <select aria-label={props.labels.sort} value={props.sort} onChange={(event) => props.onSort(event.target.value)} className={inputClassName}>
          <option value="newest">{props.labels.newest}</option>
          <option value="popular">{props.labels.popular}</option>
          <option value="price_asc">{props.labels.priceAsc}</option>
          <option value="price_desc">{props.labels.priceDesc}</option>
        </select>
      </FilterSection>

      {props.categories.length ? (
        <FilterSection label={props.labels.category}>
          <div className="space-y-1.5">
            {props.categories.map((category) => (
              <CheckRow key={category.id} checked={props.selectedCategories.includes(category.slug)} label={category.name} onChange={(checked) => props.onCategories(toggle(props.selectedCategories, category.slug, checked))} />
            ))}
          </div>
        </FilterSection>
      ) : null}

      {props.onPrice ? (
        <FilterSection label={props.labels.priceRange}>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <input aria-label={props.labels.minimumPrice} inputMode="numeric" type="number" min="0" value={props.priceMin} onChange={(event) => props.onPrice?.(event.target.value, props.priceMax ?? "")} placeholder={props.labels.min} className={inputClassName} />
            <span aria-hidden="true" className="text-brand-muted">–</span>
            <input aria-label={props.labels.maximumPrice} inputMode="numeric" type="number" min="0" value={props.priceMax} onChange={(event) => props.onPrice?.(props.priceMin ?? "", event.target.value)} placeholder={props.labels.max} className={inputClassName} />
          </div>
        </FilterSection>
      ) : null}

      {props.designers?.length && props.onDesigners ? (
        <FilterSection label={props.labels.designer}>
          <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
            {props.designers.map((designer) => (
              <CheckRow key={designer.handle} checked={props.selectedDesigners?.includes(designer.handle) ?? false} label={designer.displayName} onChange={(checked) => props.onDesigners?.(toggle(props.selectedDesigners ?? [], designer.handle, checked))} />
            ))}
          </div>
        </FilterSection>
      ) : null}

      {props.onHasFilm ? (
        <FilterSection label={props.labels.availability}>
          <CheckRow checked={Boolean(props.hasFilm)} label={props.labels.hasFilm} onChange={props.onHasFilm} />
        </FilterSection>
      ) : null}
    </div>
  );
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return <fieldset className="py-4"><legend className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-muted">{label}</legend>{children}</fieldset>;
}

function CheckRow({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm text-brand-text transition-colors hover:bg-brand-blueLight/25">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-surface-border text-brand-blue focus:ring-brand-blue" />
      <span>{label}</span>
    </label>
  );
}

function toggle(items: string[], value: string, checked: boolean) {
  return checked ? [...new Set([...items, value])] : items.filter((item) => item !== value);
}

const inputClassName = "h-11 w-full rounded-xl border border-transparent bg-brand-bg px-3 text-sm text-brand-ink outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/15";
