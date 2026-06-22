"use client";

import { BadgeNew, Button } from "@rashpod/ui";
import { useTranslations } from "next-intl";
import type { CropItem } from "./toolbox-types";

export function CropFileList({
  items,
  activeId,
  onSelect,
}: {
  items: CropItem[];
  activeId?: string;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations("toolbox.batchCrop");

  return (
    <div className="rounded-[24px] border border-surface-borderSoft bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-brand-ink">{t("filesTitle")}</h3>
        <BadgeNew variant="gray">{items.length}</BadgeNew>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((item, index) => (
          <Button
            key={item.id}
            type="button"
            variant={item.id === activeId ? "primaryBlue" : "ghost"}
            className="w-full justify-between px-4"
            onClick={() => onSelect(item.id)}
          >
            <span className="truncate">{item.file.name}</span>
            <span className="text-xs opacity-80">{t("imageIndex", { index: index + 1 })}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
