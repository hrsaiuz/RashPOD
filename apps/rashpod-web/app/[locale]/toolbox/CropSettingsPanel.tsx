"use client";

import { Button, Input, Select } from "@rashpod/ui";
import { useTranslations } from "next-intl";
import { CROP_PRESETS, type CropPresetId, type OutputFormat } from "./toolbox-types";

type CropSettings = {
  presetId: CropPresetId;
  customWidth: number;
  customHeight: number;
  outputFormat: OutputFormat;
  jpegQuality: number;
  transparentBackground: boolean;
  backgroundColor: string;
};

export function CropSettingsPanel({
  settings,
  onChange,
  onApplyCurrentToAll,
  disableApplyAll,
}: {
  settings: CropSettings;
  onChange: (patch: Partial<CropSettings>) => void;
  onApplyCurrentToAll: () => void;
  disableApplyAll: boolean;
}) {
  const t = useTranslations("toolbox.batchCrop");

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-surface-borderSoft bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-brand-ink">{t("settingsTitle")}</h3>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-brand-ink">{t("presetLabel")}</span>
            <Select value={settings.presetId} onChange={(event) => onChange({ presetId: event.target.value as CropPresetId })}>
              {CROP_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {t(preset.translationKey)}
                </option>
              ))}
              <option value="custom">{t("presets.custom")}</option>
            </Select>
          </label>

          {settings.presetId === "custom" ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-brand-ink">{t("widthLabel")}</span>
                <Input
                  type="number"
                  min={1}
                  value={settings.customWidth}
                  onChange={(event) => onChange({ customWidth: Number(event.target.value) || 0 })}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-brand-ink">{t("heightLabel")}</span>
                <Input
                  type="number"
                  min={1}
                  value={settings.customHeight}
                  onChange={(event) => onChange({ customHeight: Number(event.target.value) || 0 })}
                />
              </label>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-brand-ink">{t("formatLabel")}</span>
            <Select value={settings.outputFormat} onChange={(event) => onChange({ outputFormat: event.target.value as OutputFormat })}>
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
            </Select>
          </label>

          {settings.outputFormat === "jpeg" ? (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-brand-ink">{t("jpegQualityLabel", { value: Math.round(settings.jpegQuality * 100) })}</span>
              <input
                type="range"
                min={0.4}
                max={1}
                step={0.05}
                value={settings.jpegQuality}
                onChange={(event) => onChange({ jpegQuality: Number(event.target.value) })}
                className="w-full accent-brand-blue"
              />
            </label>
          ) : null}

          {settings.outputFormat === "png" ? (
            <label className="flex items-center gap-3 rounded-[18px] border border-surface-borderSoft bg-brand-blue/5 px-4 py-3 text-sm text-brand-ink">
              <input
                type="checkbox"
                checked={settings.transparentBackground}
                onChange={(event) => onChange({ transparentBackground: event.target.checked })}
                className="h-4 w-4 rounded border-surface-border accent-brand-blue"
              />
              {t("transparentBackgroundLabel")}
            </label>
          ) : null}

          {settings.outputFormat === "jpeg" || !settings.transparentBackground ? (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-brand-ink">{t("backgroundLabel")}</span>
              <Input type="color" value={settings.backgroundColor} onChange={(event) => onChange({ backgroundColor: event.target.value })} className="h-12 p-2" />
            </label>
          ) : null}
        </div>
      </section>

      <section className="rounded-[24px] border border-surface-borderSoft bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-brand-ink">{t("bulkActionsTitle")}</h3>
        <Button type="button" variant="secondary" className="mt-4 w-full" onClick={onApplyCurrentToAll} disabled={disableApplyAll}>
          {t("applyToAll")}
        </Button>
      </section>
    </div>
  );
}
