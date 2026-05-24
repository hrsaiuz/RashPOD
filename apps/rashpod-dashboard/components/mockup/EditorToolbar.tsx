"use client";

import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Crosshair } from "lucide-react";
import { Button } from "@rashpod/ui";

export function EditorToolbar(props: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
  onCenter: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="secondary" onClick={props.onZoomOut} aria-label="Zoom out">
        <ZoomOut size={16} />
      </Button>
      <Button type="button" size="sm" variant="secondary" onClick={props.onZoomIn} aria-label="Zoom in">
        <ZoomIn size={16} />
      </Button>
      <Button type="button" size="sm" variant="secondary" onClick={props.onFit}>
        <Maximize2 size={16} /> Fit
      </Button>
      <Button type="button" size="sm" variant="secondary" onClick={props.onCenter}>
        <Crosshair size={16} /> Center
      </Button>
      <Button type="button" size="sm" variant="secondary" onClick={props.onReset}>
        <RotateCcw size={16} /> Reset
      </Button>
    </div>
  );
}
