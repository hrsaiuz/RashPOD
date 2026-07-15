"use client";

import * as React from "react";
import { ImageOff } from "lucide-react";
import { cn } from "../lib/utils";

export interface MediaImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  fallbackLabel?: string;
  containerClassName?: string;
}

/** Native image rendering keeps SVGs vector-based and supports local or media-library URLs. */
export const MediaImage = React.forwardRef<HTMLImageElement, MediaImageProps>(function MediaImage(
  { src, alt, fallbackLabel = "Image unavailable", className, containerClassName, onError, onLoad, ...props },
  ref,
) {
  const [failed, setFailed] = React.useState(!src);

  React.useEffect(() => setFailed(!src), [src]);

  return (
    <span className={cn("relative flex overflow-hidden", containerClassName)}>
      {!failed && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          {...props}
          ref={ref}
          src={src}
          alt={alt ?? ""}
          className={cn("block h-full w-full object-contain", className)}
          onLoad={(event) => {
            setFailed(false);
            onLoad?.(event);
          }}
          onError={(event) => {
            setFailed(true);
            onError?.(event);
          }}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center gap-2 text-sm font-semibold text-brand-muted" role="img" aria-label={fallbackLabel}>
          <ImageOff size={20} aria-hidden="true" />
          <span>{fallbackLabel}</span>
        </span>
      )}
    </span>
  );
});
