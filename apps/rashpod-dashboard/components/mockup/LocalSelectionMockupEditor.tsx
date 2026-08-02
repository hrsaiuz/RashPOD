"use client";

import { useEffect, useMemo, useState } from "react";
import { editorStateFromLocalPosition, toLocalSelectionPosition, type EditorPlacementState } from "@rashpod/mockup";
import { api } from "../../lib/api";
import { MockupPlacementEditor } from "./MockupPlacementEditorDynamic";
import type { MockupEditorContextResponse } from "./types";

export function LocalSelectionMockupEditor(props: {
  designId: string;
  selection: {
    localBaseProductId: string;
    mockupTemplateId: string;
    printAreaId: string;
    placementPresetId?: string;
    preferContextInitialPlacement: boolean;
    unit: "CM" | "PX";
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
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!props.designId || !props.selection.localBaseProductId || !props.selection.mockupTemplateId || !props.selection.printAreaId) {
      setContext(null);
      setLoading(false);
      setError("");
      return;
    }
    let cancelled = false;
    setContext(null);
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      localBaseProductId: props.selection.localBaseProductId,
      mockupTemplateId: props.selection.mockupTemplateId,
      printAreaId: props.selection.printAreaId,
    });
    if (props.selection.placementPresetId) {
      params.set("placementPresetId", props.selection.placementPresetId);
    }
    api
      .get<MockupEditorContextResponse>(`/admin/designs/${props.designId}/mockup-editor-context?${params.toString()}`)
      .then((response) => {
        if (!cancelled) setContext(response);
      })
      .catch((e) => {
        if (!cancelled) setError(placementEditorError(e, "Failed to load mockup editor"));
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
    retryKey,
  ]);

  const editorContext = useMemo(
    () => context
      ? {
          ...context,
          initialPlacement: props.selection.preferContextInitialPlacement
            ? context.initialPlacement
            : editorStateFromLocalPosition(
                {
                  widthPx: props.selection.widthPx,
                  heightPx: props.selection.heightPx,
                  xPx: props.selection.xPx,
                  yPx: props.selection.yPx,
                  widthCm: props.selection.widthCm,
                  heightCm: props.selection.heightCm,
                  xCm: props.selection.xCm,
                  yCm: props.selection.yCm,
                  scale: props.selection.scale,
                  rotation: props.selection.rotation,
                },
                context.printArea,
                props.selection.unit,
              ),
        }
      : null,
    [
      context,
      props.selection.heightCm,
      props.selection.heightPx,
      props.selection.preferContextInitialPlacement,
      props.selection.rotation,
      props.selection.scale,
      props.selection.unit,
      props.selection.widthCm,
      props.selection.widthPx,
      props.selection.xCm,
      props.selection.xPx,
      props.selection.yCm,
      props.selection.yPx,
    ],
  );

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
    return <div className="rounded-2xl border border-surface-borderSoft bg-white p-4 text-sm text-brand-muted" role="status">Loading placement editor...</div>;
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-status-danger/30 bg-status-danger/5 p-4 text-sm text-status-danger" role="alert">
        <p>{error}</p>
        <button
          type="button"
          className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-status-danger/40 px-4 font-semibold outline-none hover:bg-status-danger/10 focus-visible:ring-4 focus-visible:ring-status-danger/20"
          onClick={() => setRetryKey((current) => current + 1)}
        >
          Try again
        </button>
      </div>
    );
  }
  if (!context || !editorContext) return null;

  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const editorKey = [
    props.selection.localBaseProductId,
    props.selection.mockupTemplateId,
    props.selection.printAreaId,
    props.selection.placementPresetId || "print-area-default",
  ].join(":");

  return <MockupPlacementEditor key={editorKey} context={editorContext} onChange={handleChange} reducedMotion={reducedMotion} />;
}

function placementEditorError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return message.includes("DESIGN_FILE_MISSING")
    ? "Artwork for this print placement has not been uploaded. Ask the designer to add the matching placement file, then try again."
    : message;
}
