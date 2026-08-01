"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Image as KonvaImage, Layer, Rect, Stage, Transformer } from "react-konva";
import type Konva from "konva";
import { clampPlacementToPrintArea, type EditorPlacementState, type PlacementConstraints } from "@rashpod/mockup";
import { EditorToolbar } from "./EditorToolbar";
import { useMockupEditorState } from "./useMockupEditorState";
import type { MockupEditorContextResponse } from "./types";
import { useImage } from "./useImage";
import { rashpodTokens } from "../../../../rashpod-ui-tokens";

function DesignNode(props: {
  image: HTMLImageElement;
  placement: EditorPlacementState;
  constraints: PlacementConstraints;
  onChange: (placement: EditorPlacementState) => void;
}) {
  const shapeRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const renderedWidth = props.placement.width * props.placement.scale;
  const renderedHeight = props.placement.height * props.placement.scale;

  useEffect(() => {
    if (transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [props.placement]);

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        image={props.image}
        x={props.placement.x + renderedWidth / 2}
        y={props.placement.y + renderedHeight / 2}
        width={renderedWidth}
        height={renderedHeight}
        offsetX={renderedWidth / 2}
        offsetY={renderedHeight / 2}
        rotation={props.placement.rotation}
        draggable={props.constraints.allowMove !== false}
        onDragEnd={(event) => {
          const node = event.target;
          props.onChange({
            ...props.placement,
            x: Math.round(node.x() - renderedWidth / 2),
            y: Math.round(node.y() - renderedHeight / 2),
          });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          const placementScale = props.placement.scale > 0 ? props.placement.scale : 1;
          const nextRenderedWidth = node.width() * scaleX;
          const nextRenderedHeight = node.height() * scaleY;
          node.scaleX(1);
          node.scaleY(1);
          props.onChange({
            ...props.placement,
            x: Math.round(node.x() - nextRenderedWidth / 2),
            y: Math.round(node.y() - nextRenderedHeight / 2),
            width: Math.max(1, Math.round(nextRenderedWidth / placementScale)),
            height: Math.max(1, Math.round(nextRenderedHeight / placementScale)),
            rotation: props.constraints.allowRotate === false ? 0 : Math.round(node.rotation()),
          });
        }}
      />
      <Transformer
        ref={transformerRef}
        rotateEnabled={props.constraints.allowRotate !== false}
        enabledAnchors={
          props.constraints.allowResize === false
            ? []
            : ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]
        }
        boundBoxFunc={(oldBox, newBox) => {
          if (newBox.width < 20 || newBox.height < 20) return oldBox;
          return newBox;
        }}
      />
    </>
  );
}

export function MockupPlacementEditor(props: {
  context: MockupEditorContextResponse;
  onChange: (placement: EditorPlacementState) => void;
  reducedMotion?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 720, height: 480 });
  const [imageRetryKey, setImageRetryKey] = useState(0);
  const templateImage = useImage(props.context.templateImageUrl, imageRetryKey);
  const designImage = useImage(props.context.designImageUrl, imageRetryKey);
  // Print/safe-area coordinates are authored in the template coordinate space
  // returned by the API. A Printful catalog thumbnail can have different raw
  // pixel dimensions, so using naturalWidth/naturalHeight here offsets the
  // overlays and can place them outside the product image.
  const templateWidthPx = props.context.templateWidthPx || templateImage.image?.naturalWidth || 2000;
  const templateHeightPx = props.context.templateHeightPx || templateImage.image?.naturalHeight || 2000;
  const initialPlacementSignature = [
    props.context.initialPlacement.x,
    props.context.initialPlacement.y,
    props.context.initialPlacement.width,
    props.context.initialPlacement.height,
    props.context.initialPlacement.scale,
    props.context.initialPlacement.rotation,
  ].join(":");
  const emittedInitialSignatureRef = useRef(initialPlacementSignature);

  const editor = useMockupEditorState({
    printArea: props.context.printArea,
    constraints: props.context.constraints,
    initialPlacement: props.context.initialPlacement,
    templateWidthPx,
    templateHeightPx,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    reducedMotion: props.reducedMotion,
  });

  useEffect(() => {
    if (!templateImage.image || !designImage.image) return;
    if (emittedInitialSignatureRef.current !== initialPlacementSignature) {
      emittedInitialSignatureRef.current = initialPlacementSignature;
      return;
    }
    props.onChange(editor.placement);
  }, [designImage.image, editor.placement, initialPlacementSignature, templateImage.image]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      const templateRatio = templateHeightPx / templateWidthPx;
      setViewport({ width, height: Math.max(360, Math.min(760, width * templateRatio)) });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [templateHeightPx, templateWidthPx]);

  const handlePlacementChange = (next: EditorPlacementState) => {
    const clamped = clampPlacementToPrintArea(next, props.context.printArea, props.context.constraints);
    editor.applyPlacement(clamped);
  };

  const handleEditorKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    const deltaX = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    const deltaY = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
    editor.nudgePlacement(deltaX, deltaY);
  };

  if (templateImage.error || designImage.error) {
    return (
      <div className="rounded-2xl border border-dashed border-surface-borderSoft bg-brand-bg/40 p-6 text-sm text-brand-muted" role="alert">
        <p>Mockup preview unavailable. Ensure template and design images are uploaded to storage.</p>
        <button
          type="button"
          className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-brand-blue px-4 font-semibold text-brand-blue outline-none hover:bg-brand-blue/5 focus-visible:ring-4 focus-visible:ring-brand-blue/20"
          onClick={() => setImageRetryKey((current) => current + 1)}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!templateImage.image || !designImage.image) {
    return <div className="rounded-2xl border border-surface-borderSoft bg-white p-6 text-sm text-brand-muted">Loading mockup editor...</div>;
  }

  const printArea = props.context.printArea;

  return (
    <div className="space-y-3">
      <EditorToolbar
        onZoomIn={editor.zoomIn}
        onZoomOut={editor.zoomOut}
        onFit={editor.fitToViewport}
        onReset={editor.resetPlacement}
        onCenter={editor.centerPlacement}
        canCenter={props.context.constraints.allowMove !== false}
      />
      <div
        ref={containerRef}
        className="overflow-hidden rounded-2xl border border-surface-borderSoft bg-brand-blueLight/40 outline-none ring-brand-blue/30 [touch-action:none] focus-visible:ring-4"
        tabIndex={0}
        role="group"
        aria-label="Mockup placement canvas. Use arrow keys to move the design and Shift plus an arrow key to move it by ten pixels."
        onKeyDown={handleEditorKeyDown}
      >
        <Stage
          width={viewport.width}
          height={viewport.height}
          scaleX={editor.stageScale}
          scaleY={editor.stageScale}
          x={editor.stagePosition.x}
          y={editor.stagePosition.y}
        >
          <Layer>
            <KonvaImage
              image={templateImage.image}
              x={0}
              y={0}
              width={templateWidthPx}
              height={templateHeightPx}
              listening={false}
            />
            <Rect
              x={printArea.x}
              y={printArea.y}
              width={printArea.width}
              height={printArea.height}
              stroke={rashpodTokens.colors.brand.blue}
              strokeWidth={2}
              dash={[12, 8]}
              listening={false}
            />
            <Rect
              x={printArea.safeX}
              y={printArea.safeY}
              width={printArea.safeWidth}
              height={printArea.safeHeight}
              stroke={rashpodTokens.colors.brand.peach}
              strokeWidth={2}
              dash={[6, 6]}
              listening={false}
            />
            <DesignNode
              image={designImage.image}
              placement={editor.placement}
              constraints={props.context.constraints}
              onChange={handlePlacementChange}
            />
          </Layer>
        </Stage>
      </div>
      <ul className="flex flex-wrap gap-4 text-xs text-brand-muted" aria-label="Placement overlay legend">
        <li className="inline-flex items-center gap-2">
          <span className="h-3 w-6 rounded-sm border-2 border-dashed border-brand-blue" aria-hidden="true" />
          Printable area
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="h-3 w-6 rounded-sm border-2 border-dashed border-brand-peach" aria-hidden="true" />
          Safe zone
        </li>
      </ul>
      <p className="text-xs text-brand-muted">
        The design must remain inside the peach safe zone.
        {props.context.constraints.allowMove === false
          ? " Placement is locked by the administrator."
          : " Focus the canvas to use arrow keys; Shift + arrow moves 10px."}
      </p>
    </div>
  );
}
