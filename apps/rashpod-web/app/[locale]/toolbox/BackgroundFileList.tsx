"use client";

import { BadgeNew, Button } from "@rashpod/ui";
import { useTranslations } from "next-intl";
import type { BackgroundItem } from "./toolbox-types";

const VARIANT_BY_STATUS = {
  ready: "gray",
  processing: "blue",
  done: "green",
  error: "red",
} as const;

export function BackgroundFileList({
  items,
  activeId,
  onSelect,
}: {
  items: BackgroundItem[];
  activeId?: string;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations("toolbox.backgroundRemover");

  return (
    <div className="rounded-[24px] border border-surface-borderSoft bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-brand-ink">{t("filesTitle")}</h3>
        <BadgeNew variant="gray">{items.length}</BadgeNew>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`w-full rounded-[18px] border px-4 py-3 text-left transition focus:outline-none focus:ring-4 focus:ring-brand-blue/20 ${
              item.id === activeId ? "border-brand-blue bg-brand-blue/5" : "border-surface-borderSoft bg-white hover:bg-brand-bg/70"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-medium text-brand-ink">{item.file.name}</span>
              <BadgeNew variant={VARIANT_BY_STATUS[item.status]}>{t(`status.${item.status}`)}</BadgeNew>
            </div>
            {item.errorMessage ? <p className="mt-2 text-xs text-semantic-dangerText">{item.errorMessage}</p> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
