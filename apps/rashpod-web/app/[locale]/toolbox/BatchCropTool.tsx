"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { BadgeNew, Button, EmptyState } from "@rashpod/ui";
import { Download, Scissors, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { exportCroppedImageBlob } from "./crop-canvas-export";
import { CropFileList } from "./CropFileList";
import { CropImageEditor } from "./CropImageEditor";
import { CropSettingsPanel } from "./CropSettingsPanel";
import { exportZipWithProgress } from "./zip-export-utils";
import { loadImageDimensions, makeToolboxId, revokeObjectUrls, stripExtension, validateBatchCropFiles } from "./toolbox-image-utils";
import { CROP_PRESETS, type CropItem, type CropPresetId, type NoticeTone, type OutputFormat } from "./toolbox-types";
import { extractApiErrorMessage } from "../../../lib/toolbox";

type CropSettings = {
  presetId: CropPresetId;
  customWidth: number;
  customHeight: number;
  outputFormat: OutputFormat;
  jpegQuality: number;
  transparentBackground: boolean;
  backgroundColor: string;
};

const INITIAL_SETTINGS: CropSettings = {
  presetId: "square",
  customWidth: 2000,
  customHeight: 2000,
  outputFormat: "png",
  jpegQuality: 0.92,
  transparentBackground: true,
  backgroundColor: "#FFFFFF",
};

export function BatchCropTool({
  onNotify,
}: {
  onNotify: (tone: NoticeTone, message: string) => void;
}) {
  const t = useTranslations("toolbox.batchCrop");
  const [items, setItems] = useState<CropItem[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [settings, setSettings] = useState<CropSettings>(INITIAL_SETTINGS);
  const [exporting, setExporting] = useState(false);
  const [zipProgress, setZipProgress] = useState<number | null>(null);
  const itemsRef = useRef<CropItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => () => revokeObjectUrls(itemsRef.current.map((item) => item.objectUrl)), []);

  const activeIndex = useMemo(() => items.findIndex((item) => item.id === activeId), [activeId, items]);
  const activeItem = activeIndex >= 0 ? items[activeIndex] : items[0];
  const preset = CROP_PRESETS.find((entry) => entry.id === settings.presetId) ?? CROP_PRESETS[0];
  const aspect = settings.presetId === "custom" ? settings.customWidth / Math.max(settings.customHeight, 1) : preset.aspect;

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const uploaded = Array.from(event.target.files ?? []);
    const validation = validateBatchCropFiles(uploaded);
    if (!validation.ok) {
      const key = validation.error === "too-many" ? "errors.tooMany" : validation.error === "too-large" ? "errors.tooLarge" : validation.error === "invalid-type" ? "errors.invalidType" : "errors.empty";
      onNotify("error", t(key));
      event.target.value = "";
      return;
    }

    try {
      const nextItems = await Promise.all(
        uploaded.map(async (file) => {
          const dimensions = await loadImageDimensions(file);
          return {
            id: makeToolboxId("crop"),
            file,
            objectUrl: URL.createObjectURL(file),
            imageWidth: dimensions.width,
            imageHeight: dimensions.height,
            crop: { x: 0, y: 0 },
            zoom: 1,
            rotation: 0,
            fitMode: "fit" as const,
          };
        }),
      );
      setItems((current) => [...current, ...nextItems]);
      setActiveId((current) => current ?? nextItems[0]?.id);
      onNotify("success", t("uploadSuccess", { count: nextItems.length }));
    } catch (error) {
      onNotify("error", extractApiErrorMessage(error, t("errors.loadFailed")));
    } finally {
      event.target.value = "";
    }
  }

  function updateActiveItem(patch: Partial<CropItem>) {
    if (!activeItem) return;
    setItems((current) => current.map((item) => (item.id === activeItem.id ? { ...item, ...patch } : item)));
  }

  function applyCurrentToAll() {
    if (!activeItem) return;
    setItems((current) =>
      current.map((item) => ({
        ...item,
        crop: activeItem.crop,
        zoom: activeItem.zoom,
        rotation: activeItem.rotation,
        fitMode: activeItem.fitMode,
      })),
    );
    onNotify("info", t("applyToAllSuccess"));
  }

  function resolvedOutputSize() {
    if (settings.presetId === "custom") {
      return {
        width: settings.customWidth,
        height: settings.customHeight,
      };
    }
    return { width: preset.width, height: preset.height };
  }

  async function exportAll() {
    if (!items.length) return;
    const { width, height } = resolvedOutputSize();
    if (width <= 0 || height <= 0) {
      onNotify("error", t("errors.invalidCustomSize"));
      return;
    }

    setExporting(true);
    setZipProgress(0);

    try {
      const files = [];
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (!item.areaPixels) throw new Error(t("errors.cropNotReady"));
        const blob = await exportCroppedImageBlob({
          sourceUrl: item.objectUrl,
          cropAreaPixels: item.areaPixels,
          rotation: item.rotation,
          width,
          height,
          format: settings.outputFormat,
          jpegQuality: settings.jpegQuality,
          backgroundColor: settings.backgroundColor,
          transparentBackground: settings.transparentBackground,
        });
        files.push({
          filename: `${stripExtension(item.file.name)}-cropped.${settings.outputFormat === "png" ? "png" : "jpg"}`,
          blob,
        });
      }

      await exportZipWithProgress(files, "toolbox-cropped-images.zip", setZipProgress);
      onNotify("success", t("exportSuccess", { count: items.length }));
    } catch (error) {
      onNotify("error", extractApiErrorMessage(error, t("errors.exportFailed")));
    } finally {
      setExporting(false);
      setZipProgress(null);
    }
  }

  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex >= 0 && activeIndex < items.length - 1;

  return (
    <section className="mt-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-[18px] bg-brand-blue/15 text-brand-blue">
            <Scissors aria-hidden="true" size={22} />
          </div>
          <div>
            <h2 className="text-[26px] font-semibold text-brand-ink">{t("title")}</h2>
            <p className="text-sm text-brand-muted">{t("subtitle")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-pill bg-brand-blue px-6 py-3 text-sm font-semibold text-white shadow-blueGlow">
            <Upload size={16} aria-hidden="true" />
            {t("uploadLabel")}
            <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={handleUpload} />
          </label>
          <Button type="button" variant="primaryPeach" onClick={exportAll} disabled={!items.length || exporting}>
            <Download size={16} aria-hidden="true" /> {exporting ? t("exporting") : t("exportZip")}
          </Button>
        </div>
      </div>

      {zipProgress !== null ? (
        <div className="rounded-[18px] border border-surface-borderSoft bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3 text-sm text-brand-ink">
            <span>{t("zipProgress", { value: Math.round(zipProgress) })}</span>
            <BadgeNew variant="blue">{Math.round(zipProgress)}%</BadgeNew>
          </div>
          <div className="mt-3 h-2 rounded-full bg-brand-blue/10">
            <div className="h-full rounded-full bg-brand-blue transition-[width]" style={{ width: `${zipProgress}%` }} />
          </div>
        </div>
      ) : null}

      {!items.length ? (
        <div className="rounded-[28px] border border-dashed border-surface-border bg-white/85 p-10 shadow-soft">
          <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_280px]">
          <CropSettingsPanel settings={settings} onChange={(patch) => setSettings((current) => ({ ...current, ...patch }))} onApplyCurrentToAll={applyCurrentToAll} disableApplyAll={!activeItem} />
          <CropImageEditor
            item={activeItem}
            aspect={aspect}
            onChange={updateActiveItem}
            onCropComplete={(areaPixels) => updateActiveItem({ areaPixels })}
            onNext={() => hasNext && setActiveId(items[activeIndex + 1].id)}
            onPrevious={() => hasPrevious && setActiveId(items[activeIndex - 1].id)}
            hasNext={hasNext}
            hasPrevious={hasPrevious}
          />
          <CropFileList items={items} activeId={activeItem?.id} onSelect={setActiveId} />
        </div>
      )}
    </section>
  );
}
