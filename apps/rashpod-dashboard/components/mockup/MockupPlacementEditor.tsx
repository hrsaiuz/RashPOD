"use client";

import { useEffect, useRef, useState } from "react";
import { Image as KonvaImage, Layer, Rect, Stage, Transformer } from "react-konva";
import type Konva from "konva";
import { clampPlacementToPrintArea, type EditorPlacementState, type PlacementConstraints } from "@rashpod/mockup";
import { EditorToolbar } from "./EditorToolbar";
import { useMockupEditorState } from "./useMockupEditorState";
import type { MockupEditorContextResponse } from "./types";
import { useImage } from "./useImage";

function DesignNode(props: {
  image: HTMLImageElement;
  placement: EditorPlacementState;
  constraints: PlacementConstraints;
  onChange: (placement: EditorPlacementState) => void;
}) {
  const shapeRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

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
        x={props.placement.x}
        y={props.placement.y}
        width={props.placement.width}
        height={props.placement.height}
        rotation={props.placement.rotation}
        draggable={props.constraints.allowMove !== false}
        onDragEnd={(event) => {
          const node = event.target;
          props.onChange({
            ...props.placement,
            x: Math.round(node.x()),
            y: Math.round(node.y()),
          });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          props.onChange({
            ...props.placement,
            x: Math.round(node.x()),
            y: Math.round(node.y()),
            width: Math.max(20, Math.round(node.width() * scaleX)),
            height: Math.max(20, Math.round(node.height() * scaleY)),
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
  const templateImage = useImage(props.context.templateImageUrl);
  const designImage = useImage(props.context.designImageUrl);

  const editor = useMockupEditorState({
    printArea: props.context.printArea,
    constraints: props.context.constraints,
    initialPlacement: props.context.initialPlacement,
    templateWidthPx: props.context.templateWidthPx,
    templateHeightPx: props.context.templateHeightPx,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    reducedMotion: props.reducedMotion,
  });

  useEffect(() => {
    props.onChange(editor.placement);
  }, [editor.placement]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewport({ width: entry.contentRect.width, height: Math.max(360, entry.contentRect.width * 0.66) });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handlePlacementChange = (next: EditorPlacementState) => {
    const clamped = clampPlacementToPrintArea(next, props.context.printArea);
    editor.applyPlacement(clamped);
  };

  if (templateImage.error || designImage.error) {
    return (
      <div className="rounded-2xl border border-dashed border-surface-borderSoft bg-brand-bg/40 p-6 text-sm text-brand-muted">
        Mockup preview unavailable. Ensure template and design images are uploaded to storage.
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
      />
      <div ref={containerRef} className="overflow-hidden rounded-2xl border border-surface-borderSoft bg-[#E8EBF8]">
        <Stage
          width={viewport.width}
          height={viewport.height}
          scaleX={editor.stageScale}
          scaleY={editor.stageScale}
          x={editor.stagePosition.x}
          y={editor.stagePosition.y}
          draggable
          onDragEnd={(event) => editor.setStagePosition({ x: event.target.x(), y: event.target.y() })}
        >
          <Layer>
            <KonvaImage
              image={templateImage.image}
              x={0}
              y={0}
              width={props.context.templateWidthPx}
              height={props.context.templateHeightPx}
              listening={false}
            />
            <Rect
              x={printArea.x}
              y={printArea.y}
              width={printArea.width}
              height={printArea.height}
              stroke="#788AE0"
              strokeWidth={2}
              dash={[12, 8]}
              listening={false}
            />
            <Rect
              x={printArea.safeX}
              y={printArea.safeY}
              width={printArea.safeWidth}
              height={printArea.safeHeight}
              stroke="#F39E7C"
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
      <p className="text-xs text-brand-muted">
        Arrow keys nudge placement. Shift + arrow moves 10px. Drag and resize within the safe zone.
      </p>
    </div>
  );
}
