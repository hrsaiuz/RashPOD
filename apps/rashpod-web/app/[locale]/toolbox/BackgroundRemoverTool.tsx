"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { BadgeNew, Button, EmptyState, ErrorState, Spinner } from "@rashpod/ui";
import { Download, Eraser, Sparkles, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { extractApiErrorMessage, removeBackgroundFromImages, triggerBlobDownload } from "../../../lib/toolbox";
import { BackgroundFileList } from "./BackgroundFileList";
import { BackgroundPreview } from "./BackgroundPreview";
import { validateBackgroundFiles, makeToolboxId, revokeObjectUrls, stripExtension } from "./toolbox-image-utils";
import type { BackgroundItem, NoticeTone } from "./toolbox-types";
import { exportZipWithProgress } from "./zip-export-utils";

export function BackgroundRemoverTool({
  onNotify,
}: {
  onNotify: (tone: NoticeTone, message: string) => void;
}) {
  const t = useTranslations("toolbox.backgroundRemover");
  const [items, setItems] = useState<BackgroundItem[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [processing, setProcessing] = useState(false);
  const [zipProgress, setZipProgress] = useState<number | null>(null);
  const activeItem = useMemo(() => items.find((item) => item.id === activeId) ?? items[0], [activeId, items]);
  const itemsRef = useRef<BackgroundItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => () => revokeObjectUrls(itemsRef.current.flatMap((item) => [item.originalUrl, item.resultUrl])), []);

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const uploaded = Array.from(event.target.files ?? []);
    const validation = validateBackgroundFiles(uploaded);
    if (!validation.ok) {
      const key = validation.error === "too-many" ? "errors.tooMany" : validation.error === "too-large" ? "errors.tooLarge" : validation.error === "invalid-type" ? "errors.invalidType" : "errors.empty";
      onNotify("error", t(key));
      event.target.value = "";
      return;
    }

    const nextItems = uploaded.map((file) => ({
      id: makeToolboxId("bg"),
      file,
      originalUrl: URL.createObjectURL(file),
      status: "ready" as const,
    }));
    setItems((current) => [...current, ...nextItems]);
    setActiveId((current) => current ?? nextItems[0]?.id);
    onNotify("success", t("uploadSuccess", { count: nextItems.length }));
    event.target.value = "";
  }

  async function processAll() {
    const readyItems = items.filter((item) => item.status === "ready");
    if (!readyItems.length) return;

    setProcessing(true);
    setItems((current) => current.map((item) => (item.status === "ready" ? { ...item, status: "processing", errorMessage: undefined } : item)));

    try {
      const response = await removeBackgroundFromImages(readyItems.map((item) => item.file));
      const resultMap = new Map(response.results.map((result) => [result.inputName, result]));

      setItems((current) =>
        current.map((item) => {
          const result = resultMap.get(item.file.name);
          if (!result || result.status !== "done" || !result.base64Data) {
            return {
              ...item,
              status: "error",
              errorMessage: result?.errorMessage ?? t("errors.unexpectedResult"),
            };
          }

          const binary = atob(result.base64Data);
          const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
          const blob = new Blob([bytes], { type: result.mimeType || "image/png" });
          return {
            ...item,
            status: "done",
            resultBlob: blob,
            resultUrl: URL.createObjectURL(blob),
            errorMessage: undefined,
          };
        }),
      );
      onNotify("success", t("processSuccess"));
    } catch (error) {
      const message = extractApiErrorMessage(error, t("errors.processingFailed"));
      setItems((current) =>
        current.map((item) => (item.status === "processing" ? { ...item, status: "error", errorMessage: message } : item)),
      );
      onNotify("error", message);
    } finally {
      setProcessing(false);
    }
  }

  function downloadSingle(item?: BackgroundItem) {
    if (!item?.resultBlob) return;
    triggerBlobDownload(item.resultBlob, `${stripExtension(item.file.name)}-background-removed.png`);
  }

  async function downloadAll() {
    const doneItems = items.filter((item) => item.resultBlob);
    if (!doneItems.length) return;
    setZipProgress(0);
    try {
      await exportZipWithProgress(
        doneItems.map((item) => ({
          filename: `${stripExtension(item.file.name)}-background-removed.png`,
          blob: item.resultBlob!,
        })),
        "toolbox-background-removed.zip",
        setZipProgress,
      );
      onNotify("success", t("zipSuccess"));
    } catch (error) {
      onNotify("error", extractApiErrorMessage(error, t("errors.zipFailed")));
    } finally {
      setZipProgress(null);
    }
  }

  const doneCount = items.filter((item) => item.status === "done").length;

  return (
    <section className="mt-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-[18px] bg-brand-peach/15 text-brand-peach">
            <Eraser aria-hidden="true" size={22} />
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
          <Button type="button" variant="primaryPeach" onClick={processAll} disabled={!items.some((item) => item.status === "ready") || processing}>
            {processing ? <Spinner /> : <Sparkles size={16} aria-hidden="true" />} {t("processAll")}
          </Button>
          <Button type="button" variant="secondary" onClick={downloadAll} disabled={!doneCount || zipProgress !== null}>
            <Download size={16} aria-hidden="true" /> {t("downloadAll")}
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
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <BackgroundFileList items={items} activeId={activeItem?.id} onSelect={setActiveId} />
          <div className="space-y-6">
            <BackgroundPreview item={activeItem} onDownload={() => downloadSingle(activeItem)} />
            {activeItem?.status === "error" && activeItem.errorMessage ? (
              <ErrorState title={t("configErrorTitle")} description={activeItem.errorMessage} />
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
