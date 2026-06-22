"use client";

import { Card } from "@rashpod/ui";
import { cn } from "@rashpod/ui";
import { ArrowRight, Scissors, Wand2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ToolboxToolId } from "./toolbox-types";

const ICONS = {
  "batch-crop": Scissors,
  "background-remover": Wand2,
} as const;

export function ToolboxToolCard({
  id,
  title,
  description,
  active,
  onClick,
}: {
  id: ToolboxToolId;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("toolbox");
  const Icon = ICONS[id];

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left focus:outline-none focus:ring-4 focus:ring-brand-blue/20 rounded-[24px]"
      aria-pressed={active}
    >
      <Card
        variant="lift"
        className={cn(
          "h-full rounded-[24px] border transition-colors",
          active
            ? "border-brand-blue bg-[linear-gradient(180deg,#FFFFFF_0%,#EEF1FF_100%)]"
            : "border-surface-borderSoft bg-[linear-gradient(180deg,#FFFFFF_0%,#F7F8FF_100%)]",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-[18px] bg-brand-blue/10 text-brand-blue">
            <Icon aria-hidden="true" size={24} />
          </div>
          <span className={cn("inline-flex items-center gap-1 text-sm font-semibold", active ? "text-brand-blue" : "text-brand-muted")}>
            {active ? t("activeLabel") : t("openLabel")} <ArrowRight size={16} aria-hidden="true" />
          </span>
        </div>
        <h2 className="mt-5 text-[22px] font-semibold text-brand-ink">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-brand-muted">{description}</p>
      </Card>
    </button>
  );
}
