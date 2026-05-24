"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { Card } from "@rashpod/ui";

type DesignPreviewCardProps = {
  title?: string;
  src?: string | null;
  alt?: string;
  widthPx?: number | null;
  heightPx?: number | null;
  compact?: boolean;
};

export function DesignPreviewCard({
  title = "Design preview",
  src,
  alt = "Design artwork",
  widthPx,
  heightPx,
  compact = false,
}: DesignPreviewCardProps) {
  const [failed, setFailed] = useState(false);

  return (
    <Card>
      <h2 className={`font-semibold text-brand-ink ${compact ? "mb-2 text-base" : "mb-3 text-lg"}`}>{title}</h2>
      {src && !failed ? (
        <div className="relative overflow-hidden rounded-2xl border border-surface-borderSoft bg-[repeating-conic-gradient(#e8ebf5_0%_25%,#f0f2fa_0%_50%)] bg-[length:20px_20px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className={`mx-auto w-auto max-w-full object-contain ${compact ? "max-h-64" : "max-h-[480px]"}`}
            onError={() => setFailed(true)}
          />
        </div>
      ) : (
        <div className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-borderSoft text-brand-muted ${compact ? "py-10" : "py-16"}`}>
          <ImageIcon size={compact ? 24 : 32} />
          <p className="text-sm">{failed ? "Preview could not be loaded" : "No preview available yet"}</p>
        </div>
      )}
      {widthPx && heightPx ? (
        <p className="mt-2 text-xs text-brand-muted">{widthPx} × {heightPx}px</p>
      ) : null}
    </Card>
  );
}
