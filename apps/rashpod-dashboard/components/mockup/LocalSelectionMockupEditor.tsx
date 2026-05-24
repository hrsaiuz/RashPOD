"use client";

import { useEffect, useState } from "react";
import { toLocalSelectionPosition, type EditorPlacementState } from "@rashpod/mockup";
import { api } from "../../lib/api";
import { MockupPlacementEditor } from "./MockupPlacementEditorDynamic";
import type { MockupEditorContextResponse } from "./types";

export function LocalSelectionMockupEditor(props: {
  designId: string;
  selection: {
    localBaseProductId: string;
    mockupTemplateId: string;
    printAreaId: string;
    placementPresetId: string;
    unit: "CM" | "PX";
  };
  onPlacementChange: (payload: {
    widthPx: number;
    heightPx: number;
    xPx: number;
    yPx: number;
    widthCm: number;
    heightCm: number;
    xCm: number;
    yCm: number;
    scale: number;
    rotation: number;
  }) => void;
}) {
  const [context, setContext] = useState<MockupEditorContextResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!props.designId || !props.selection.localBaseProductId || !props.selection.mockupTemplateId || !props.selection.printAreaId || !props.selection.placementPresetId) {
      setContext(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      localBaseProductId: props.selection.localBaseProductId,
      mockupTemplateId: props.selection.mockupTemplateId,
      printAreaId: props.selection.printAreaId,
      placementPresetId: props.selection.placementPresetId,
    });
    api
      .get<MockupEditorContextResponse>(`/admin/designs/${props.designId}/mockup-editor-context?${params.toString()}`)
      .then((response) => {
        if (!cancelled) setContext(response);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load mockup editor");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    props.designId,
    props.selection.localBaseProductId,
    props.selection.mockupTemplateId,
    props.selection.printAreaId,
    props.selection.placementPresetId,
  ]);

  function handleChange(placement: EditorPlacementState) {
    if (!context) return;
    const px = toLocalSelectionPosition(placement, context.printArea, "PX");
    const cm = toLocalSelectionPosition(placement, context.printArea, "CM");
    props.onPlacementChange({
      widthPx: "widthPx" in px ? px.widthPx : placement.width,
      heightPx: "heightPx" in px ? px.heightPx : placement.height,
      xPx: "xPx" in px ? px.xPx : placement.x,
      yPx: "yPx" in px ? px.yPx : placement.y,
      widthCm: "widthCm" in cm ? cm.widthCm : 0,
      heightCm: "heightCm" in cm ? cm.heightCm : 0,
      xCm: "xCm" in cm ? cm.xCm : 0,
      yCm: "yCm" in cm ? cm.yCm : 0,
      scale: placement.scale,
      rotation: placement.rotation,
    });
  }

  if (loading) {
    return <div className="rounded-2xl border border-surface-borderSoft bg-white p-4 text-sm text-brand-muted">Loading placement editor...</div>;
  }
  if (error) {
    return <div className="rounded-2xl border border-status-danger/30 bg-status-danger/5 p-4 text-sm text-status-danger">{error}</div>;
  }
  if (!context) return null;

  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return <MockupPlacementEditor context={context} onChange={handleChange} reducedMotion={reducedMotion} />;
}
