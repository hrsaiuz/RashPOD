"use client";

import { useEffect, useState } from "react";

export function useImage(url: string | null | undefined) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) {
      setImage(null);
      setError(true);
      return;
    }
    setError(false);
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.onerror = () => setError(true);
    img.src = url;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);

  return { image, error };
}
