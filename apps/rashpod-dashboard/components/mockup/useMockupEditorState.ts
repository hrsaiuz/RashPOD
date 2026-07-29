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
  const [placement, setPlacement] = useState<EditorPlacementState>(() =>
    clampPlacementToPrintArea(input.initialPlacement, input.printArea, input.constraints),
  );
  const [stageScale, setStageScale] = useState(0.4);
  const [stagePosition, setStagePosition] = useState({ x: 24, y: 24 });

  useEffect(() => {
    setPlacement(clampPlacementToPrintArea(input.initialPlacement, input.printArea, input.constraints));
  }, [input.constraints, input.initialPlacement, input.printArea]);

  const applyPlacement = useCallback(
    (next: EditorPlacementState) => {
      const clamped = clampPlacementToPrintArea(next, input.printArea, input.constraints);
      setPlacement(clamped);
      return clamped;
    },
    [input.constraints, input.printArea],
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

  const nudgePlacement = useCallback(
    (deltaX: number, deltaY: number) => {
      if (input.constraints.allowMove === false) return;
      applyPlacement({ ...placement, x: placement.x + deltaX, y: placement.y + deltaY });
    },
    [applyPlacement, input.constraints.allowMove, placement],
  );

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
    nudgePlacement,
  };
}
