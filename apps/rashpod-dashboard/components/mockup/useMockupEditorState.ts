"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clampPlacementToPrintArea,
  snapPlacementToCenter,
  type EditorPlacementState,
  type PlacementConstraints,
  type PrintAreaRect,
} from "@rashpod/mockup";

export function useMockupEditorState(input: {
  printArea: PrintAreaRect;
  constraints: PlacementConstraints;
  initialPlacement: EditorPlacementState;
  templateWidthPx: number;
  templateHeightPx: number;
  viewportWidth: number;
  viewportHeight: number;
  reducedMotion?: boolean;
}) {
  const [placement, setPlacement] = useState<EditorPlacementState>(input.initialPlacement);
  const [stageScale, setStageScale] = useState(0.4);
  const [stagePosition, setStagePosition] = useState({ x: 24, y: 24 });

  useEffect(() => {
    setPlacement(input.initialPlacement);
  }, [input.initialPlacement]);

  const applyPlacement = useCallback(
    (next: EditorPlacementState) => {
      const clamped = clampPlacementToPrintArea(next, input.printArea);
      setPlacement(clamped);
      return clamped;
    },
    [input.printArea],
  );

  const fitToViewport = useCallback(() => {
    const padding = 32;
    const scaleX = (input.viewportWidth - padding) / input.templateWidthPx;
    const scaleY = (input.viewportHeight - padding) / input.templateHeightPx;
    const scale = Math.min(scaleX, scaleY, 1);
    setStageScale(scale);
    setStagePosition({
      x: Math.max(16, (input.viewportWidth - input.templateWidthPx * scale) / 2),
      y: Math.max(16, (input.viewportHeight - input.templateHeightPx * scale) / 2),
    });
  }, [input.templateHeightPx, input.templateWidthPx, input.viewportHeight, input.viewportWidth]);

  useEffect(() => {
    fitToViewport();
  }, [fitToViewport, input.templateWidthPx, input.templateHeightPx]);

  const zoomBy = useCallback(
    (delta: number) => {
      setStageScale((current) => Math.max(0.1, Math.min(2.5, current + delta)));
    },
    [],
  );

  const resetPlacement = useCallback(() => {
    applyPlacement(input.initialPlacement);
  }, [applyPlacement, input.initialPlacement]);

  const centerPlacement = useCallback(() => {
    applyPlacement(snapPlacementToCenter(placement, input.printArea));
  }, [applyPlacement, input.printArea, placement]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const delta = { x: 0, y: 0 };
      if (event.key === "ArrowUp") delta.y = -step;
      if (event.key === "ArrowDown") delta.y = step;
      if (event.key === "ArrowLeft") delta.x = -step;
      if (event.key === "ArrowRight") delta.x = step;
      if (input.constraints.allowMove === false) return;
      applyPlacement({ ...placement, x: placement.x + delta.x, y: placement.y + delta.y });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applyPlacement, input.constraints.allowMove, placement]);

  return {
    placement,
    stageScale,
    stagePosition,
    setStagePosition,
    applyPlacement,
    fitToViewport,
    zoomIn: () => zoomBy(input.reducedMotion ? 0.15 : 0.1),
    zoomOut: () => zoomBy(input.reducedMotion ? -0.15 : -0.1),
    resetPlacement,
    centerPlacement,
  };
}
