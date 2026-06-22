"use client";

import { useEffect, useState } from "react";
import { BadgeNew, PageContainer } from "@rashpod/ui";
import { useTranslations } from "next-intl";
import { BackgroundRemoverTool } from "./BackgroundRemoverTool";
import { BatchCropTool } from "./BatchCropTool";
import { ToolboxToolCard } from "./ToolboxToolCard";
import type { NoticeTone, ToolboxToast, ToolboxToolId } from "./toolbox-types";
import { makeToolboxId } from "./toolbox-image-utils";

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToolboxToast[];
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timers = toasts.map((toast) =>
      window.setTimeout(() => onDismiss(toast.id), 4000),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [onDismiss, toasts]);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-[20px] border px-4 py-3 shadow-lift ${
            toast.tone === "success"
              ? "border-semantic-success/20 bg-white text-semantic-successText"
              : toast.tone === "error"
                ? "border-semantic-danger/20 bg-white text-semantic-dangerText"
                : "border-brand-blue/20 bg-white text-brand-blue"
          }`}
          role="status"
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

export default function ToolboxPage() {
  const t = useTranslations("toolbox");
  const [activeTool, setActiveTool] = useState<ToolboxToolId>("batch-crop");
  const [toasts, setToasts] = useState<ToolboxToast[]>([]);

  function notify(tone: NoticeTone, message: string) {
    setToasts((current) => [...current, { id: makeToolboxId("toast"), tone, message }]);
  }

  return (
    <PageContainer variant="storefront" className="pb-16">
      <section className="rounded-[32px] bg-[linear-gradient(135deg,#FFFFFF_0%,#EEF1FF_52%,#FFD6C6_100%)] px-6 py-10 shadow-lift sm:px-8 md:px-10">
        <BadgeNew variant="blue">{t("eyebrow")}</BadgeNew>
        <h1 className="mt-4 max-w-3xl text-[34px] font-semibold leading-tight text-brand-ink md:text-[42px]">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-brand-muted md:text-lg">
          {t("subtitle")}
        </p>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2">
        <ToolboxToolCard
          id="batch-crop"
          title={t("tools.batchCrop.title")}
          description={t("tools.batchCrop.description")}
          active={activeTool === "batch-crop"}
          onClick={() => setActiveTool("batch-crop")}
        />
        <ToolboxToolCard
          id="background-remover"
          title={t("tools.backgroundRemover.title")}
          description={t("tools.backgroundRemover.description")}
          active={activeTool === "background-remover"}
          onClick={() => setActiveTool("background-remover")}
        />
      </section>

      {activeTool === "batch-crop" ? <BatchCropTool onNotify={notify} /> : null}
      {activeTool === "background-remover" ? <BackgroundRemoverTool onNotify={notify} /> : null}

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </PageContainer>
  );
}
