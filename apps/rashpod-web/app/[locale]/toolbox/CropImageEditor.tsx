"use client";

import { Button, EmptyState } from "@rashpod/ui";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { ChevronLeft, ChevronRight, RotateCw, Scan, Maximize, RefreshCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CropArea, CropItem, FitMode } from "./toolbox-types";

export function CropImageEditor({
  item,
  aspect,
  onChange,
  onCropComplete,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
}: {
  item?: CropItem;
  aspect: number;
  onChange: (patch: Partial<CropItem>) => void;
  onCropComplete: (areaPixels: CropArea) => void;
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
}) {
  const t = useTranslations("toolbox.batchCrop");

  if (!item) {
    return (
      <div className="rounded-[28px] border border-dashed border-surface-border bg-white/80 p-8 shadow-soft">
        <EmptyState title={t("emptyEditorTitle")} description={t("emptyEditorDescription")} />
      </div>
    );
  }

  const setFitMode = (fitMode: FitMode) => onChange({ fitMode });

  return (
    <div className="rounded-[28px] border border-surface-borderSoft bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-brand-ink">{item.file.name}</h3>
          <p className="text-sm text-brand-muted">{t("editorHint")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={onPrevious} disabled={!hasPrevious} aria-label={t("previousImage")}>
            <ChevronLeft size={16} aria-hidden="true" /> {t("previousImage")}
          </Button>
          <Button type="button" variant="ghost" onClick={onNext} disabled={!hasNext} aria-label={t("nextImage")}>
            {t("nextImage")} <ChevronRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="relative h-[420px] overflow-hidden rounded-[24px] bg-[radial-gradient(circle_at_top,#EEF1FF,transparent_50%),linear-gradient(180deg,#F7F8FF_0%,#FFFFFF_100%)]">
          <Cropper
            image={item.objectUrl}
            crop={item.crop}
            zoom={item.zoom}
            rotation={item.rotation}
            aspect={aspect}
            objectFit={item.fitMode === "fill" ? "cover" : "contain"}
            showGrid
            onCropChange={(crop) => onChange({ crop })}
            onZoomChange={(zoom) => onChange({ zoom })}
            onRotationChange={(rotation) => onChange({ rotation })}
            onCropComplete={(_, areaPixels) => onCropComplete(areaPixels)}
          />
        </div>

        <div className="space-y-4 rounded-[24px] border border-surface-borderSoft bg-brand-bg/60 p-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-brand-ink">{t("zoomLabel")}</label>
            <input
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={item.zoom}
              onChange={(event) => onChange({ zoom: Number(event.target.value) })}
              className="w-full accent-brand-blue"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" onClick={() => onChange({ rotation: (item.rotation + 90) % 360 })}>
              <RotateCw size={16} aria-hidden="true" /> {t("rotate")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => onChange({ crop: { x: 0, y: 0 }, zoom: 1, rotation: 0, fitMode: "fit" })}>
              <RefreshCcw size={16} aria-hidden="true" /> {t("reset")}
            </Button>
            <Button type="button" variant={item.fitMode === "fit" ? "primaryBlue" : "secondary"} onClick={() => setFitMode("fit")}>
              <Scan size={16} aria-hidden="true" /> {t("fit")}
            </Button>
            <Button type="button" variant={item.fitMode === "fill" ? "primaryBlue" : "secondary"} onClick={() => setFitMode("fill")}>
              <Maximize size={16} aria-hidden="true" /> {t("fill")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
