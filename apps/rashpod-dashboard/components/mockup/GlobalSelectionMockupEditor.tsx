"use client";

import { useEffect, useState } from "react";
import { editorStateToPrintfulPosition, type EditorPlacementState } from "@rashpod/mockup";
import { api } from "../../lib/api";
import { MockupPlacementEditor } from "./MockupPlacementEditorDynamic";
import type { PrintfulMockupEditorContextResponse } from "./types";

export function GlobalSelectionMockupEditor(props: {
  designId: string;
  selection: {
    printfulProductTemplateId: string;
    placementPresetId: string;
    placement: string;
  };
  onPlacementChange: (payload: {
    widthIn: number;
    heightIn: number;
    leftIn: number;
    topIn: number;
    scale: number;
  }) => void;
}) {
  const [context, setContext] = useState<PrintfulMockupEditorContextResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!props.designId || !props.selection.printfulProductTemplateId || !props.selection.placementPresetId || !props.selection.placement) {
      setContext(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      printfulProductTemplateId: props.selection.printfulProductTemplateId,
      placementPresetId: props.selection.placementPresetId,
      placement: props.selection.placement,
    });
    api
      .get<PrintfulMockupEditorContextResponse>(`/admin/designs/${props.designId}/printful-mockup-editor-context?${params.toString()}`)
      .then((response) => {
        if (!cancelled) setContext(response);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load Printful placement editor");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [props.designId, props.selection.printfulProductTemplateId, props.selection.placementPresetId, props.selection.placement]);

  function handleChange(placement: EditorPlacementState) {
    if (!context?.printAreaInches) return;
    const inches = editorStateToPrintfulPosition(placement, context.printArea, context.printAreaInches);
    props.onPlacementChange(inches);
  }

  if (loading) {
    return <div className="rounded-2xl border border-surface-borderSoft bg-white p-4 text-sm text-brand-muted">Loading Printful placement editor...</div>;
  }
  if (error) {
    return <div className="rounded-2xl border border-status-danger/30 bg-status-danger/5 p-4 text-sm text-status-danger">{error}</div>;
  }
  if (!context) return null;

  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return <MockupPlacementEditor context={context} onChange={handleChange} reducedMotion={reducedMotion} />;
}
