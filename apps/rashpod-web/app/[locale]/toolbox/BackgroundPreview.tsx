"use client";

import { Button, EmptyState } from "@rashpod/ui";
import { Download, ImageOff } from "lucide-react";
import { useTranslations } from "next-intl";
import type { BackgroundItem } from "./toolbox-types";

export function BackgroundPreview({
  item,
  onDownload,
}: {
  item?: BackgroundItem;
  onDownload: () => void;
}) {
  const t = useTranslations("toolbox.backgroundRemover");

  if (!item) {
    return (
      <div className="rounded-[24px] border border-dashed border-surface-border bg-white/80 p-8 shadow-soft">
        <EmptyState title={t("emptyPreviewTitle")} description={t("emptyPreviewDescription")} icon={<ImageOff size={32} />} />
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-surface-borderSoft bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-brand-ink">{t("previewTitle")}</h3>
          <p className="text-sm text-brand-muted">{item.file.name}</p>
        </div>
        <Button type="button" variant="secondary" onClick={onDownload} disabled={!item.resultBlob}>
          <Download size={16} aria-hidden="true" /> {t("downloadOne")}
        </Button>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-brand-ink">{t("originalLabel")}</p>
          <div className="flex min-h-[280px] items-center justify-center overflow-hidden rounded-[20px] border border-surface-borderSoft bg-brand-bg/70">
            <img src={item.originalUrl} alt={t("originalAlt", { filename: item.file.name })} className="max-h-[320px] w-full object-contain" />
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-brand-ink">{t("resultLabel")}</p>
          <div className="toolbox-checkerboard flex min-h-[280px] items-center justify-center overflow-hidden rounded-[20px] border border-surface-borderSoft">
            {item.resultUrl ? (
              <img src={item.resultUrl} alt={t("resultAlt", { filename: item.file.name })} className="max-h-[320px] w-full object-contain" />
            ) : (
              <EmptyState title={t("resultPendingTitle")} description={item.errorMessage ?? t("resultPendingDescription")} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
