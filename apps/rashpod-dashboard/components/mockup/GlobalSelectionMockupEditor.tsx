"use client";

import { useEffect, useMemo, useState } from "react";
import { editorStateToPrintfulPosition, printfulInchesToEditorState, type EditorPlacementState } from "@rashpod/mockup";
import { api } from "../../lib/api";
import { MockupPlacementEditor } from "./MockupPlacementEditorDynamic";
import type { PrintfulMockupEditorContextResponse } from "./types";

export function GlobalSelectionMockupEditor(props: {
  designId: string;
  selection: {
    printfulProductTemplateId: string;
    placementPresetId: string;
    placement: string;
    preferContextInitialPlacement: boolean;
    widthIn: number;
    heightIn: number;
    leftIn: number;
    topIn: number;
    scale: number;
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
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!props.designId || !props.selection.printfulProductTemplateId || !props.selection.placementPresetId || !props.selection.placement) {
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
  }, [props.designId, props.selection.printfulProductTemplateId, props.selection.placementPresetId, props.selection.placement, retryKey]);

  const editorContext = useMemo(
    () => context
      ? {
          ...context,
          initialPlacement: props.selection.preferContextInitialPlacement
            ? context.initialPlacement
            : printfulInchesToEditorState(
                {
                  widthIn: props.selection.widthIn,
                  heightIn: props.selection.heightIn,
                  leftIn: props.selection.leftIn,
                  topIn: props.selection.topIn,
                  scale: props.selection.scale,
                },
                context.printArea,
                context.printAreaInches,
              ),
        }
      : null,
    [
      context,
      props.selection.heightIn,
      props.selection.leftIn,
      props.selection.preferContextInitialPlacement,
      props.selection.scale,
      props.selection.topIn,
      props.selection.widthIn,
    ],
  );

  function handleChange(placement: EditorPlacementState) {
    if (!context?.printAreaInches) return;
    const inches = editorStateToPrintfulPosition(placement, context.printArea, context.printAreaInches);
    props.onPlacementChange(inches);
  }

  if (loading) {
    return <div className="rounded-2xl border border-surface-borderSoft bg-white p-4 text-sm text-brand-muted" role="status">Loading Printful placement editor...</div>;
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
    props.selection.printfulProductTemplateId,
    props.selection.placementPresetId,
    props.selection.placement,
  ].join(":");

  return <MockupPlacementEditor key={editorKey} context={editorContext} onChange={handleChange} reducedMotion={reducedMotion} />;
}
