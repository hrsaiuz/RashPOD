"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Image as KonvaImage, Layer, Rect, Stage, Transformer } from "react-konva";
import type Konva from "konva";
import clsx from "clsx";
import { normalizePrintAreaRects, type PrintAreaRect } from "@rashpod/mockup";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@rashpod/ui";
import { useImage } from "./useImage";

type LayerId = "print" | "safe";

type AxisRect = { x: number; y: number; width: number; height: number };

function toPrintRect(value: PrintAreaRect): AxisRect {
  return { x: value.x, y: value.y, width: value.width, height: value.height };
}

function toSafeRect(value: PrintAreaRect): AxisRect {
  return { x: value.safeX, y: value.safeY, width: value.safeWidth, height: value.safeHeight };
}

function mergeRects(value: PrintAreaRect, print: AxisRect, safe: AxisRect): PrintAreaRect {
  return {
    ...value,
    x: print.x,
    y: print.y,
    width: print.width,
    height: print.height,
    safeX: safe.x,
    safeY: safe.y,
    safeWidth: safe.width,
    safeHeight: safe.height,
  };
}

function RectEditorNode(props: {
  rect: AxisRect;
  active: boolean;
  stroke: string;
  fill: string;
  onChange: (rect: AxisRect) => void;
}) {
  const shapeRef = useRef<Konva.Rect>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (!props.active) {
      transformerRef.current?.nodes([]);
      transformerRef.current?.getLayer()?.batchDraw();
      return;
    }
    if (transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [props.active, props.rect]);

  return (
    <>
      <Rect
        ref={shapeRef}
        x={props.rect.x}
        y={props.rect.y}
        width={props.rect.width}
        height={props.rect.height}
        stroke={props.stroke}
        strokeWidth={2}
        dash={props.active ? undefined : [12, 8]}
        fill={props.fill}
        draggable={props.active}
        onDragEnd={(event) => {
          const node = event.target;
          props.onChange({
            ...props.rect,
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
            x: Math.round(node.x()),
            y: Math.round(node.y()),
            width: Math.max(20, Math.round(node.width() * scaleX)),
            height: Math.max(20, Math.round(node.height() * scaleY)),
          });
        }}
      />
      {props.active ? (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
            "middle-left",
            "middle-right",
            "top-center",
            "bottom-center",
          ]}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) return oldBox;
            return newBox;
          }}
        />
      ) : null}
    </>
  );
}

export function PrintAreaVisualEditor(props: {
  imageUrl: string | null;
  value: PrintAreaRect;
  onChange: (next: PrintAreaRect) => void;
  activeLayer?: LayerId;
  onActiveLayerChange?: (layer: LayerId) => void;
  onImageDimensions?: (width: number, height: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 720, height: 480 });
  const [stageScale, setStageScale] = useState(0.4);
  const [stagePosition, setStagePosition] = useState({ x: 24, y: 24 });
  const [internalLayer, setInternalLayer] = useState<LayerId>("print");
  const templateImage = useImage(props.imageUrl);

  const activeLayer = props.activeLayer ?? internalLayer;
  const setActiveLayer = props.onActiveLayerChange ?? setInternalLayer;

  const templateWidthPx = templateImage.image?.naturalWidth ?? 0;
  const templateHeightPx = templateImage.image?.naturalHeight ?? 0;

  const fitToViewport = useCallback(() => {
    if (!templateWidthPx || !templateHeightPx) return;
    const padding = 32;
    const scaleX = (viewport.width - padding) / templateWidthPx;
    const scaleY = (viewport.height - padding) / templateHeightPx;
    const scale = Math.min(scaleX, scaleY, 1);
    setStageScale(scale);
    setStagePosition({
      x: Math.max(16, (viewport.width - templateWidthPx * scale) / 2),
      y: Math.max(16, (viewport.height - templateHeightPx * scale) / 2),
    });
  }, [templateHeightPx, templateWidthPx, viewport.height, viewport.width]);

  useEffect(() => {
    fitToViewport();
  }, [fitToViewport, templateWidthPx, templateHeightPx]);

  useEffect(() => {
    if (!templateImage.image || !props.onImageDimensions) return;
    props.onImageDimensions(templateImage.image.naturalWidth, templateImage.image.naturalHeight);
  }, [props.onImageDimensions, templateImage.image, props.imageUrl]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewport({ width: entry.contentRect.width, height: Math.max(360, entry.contentRect.width * 0.66) });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const emitChange = useCallback(
    (print: AxisRect, safe: AxisRect) => {
      if (!templateWidthPx || !templateHeightPx) {
        props.onChange(mergeRects(props.value, print, safe));
        return;
      }
      const normalized = normalizePrintAreaRects(print, safe, templateWidthPx, templateHeightPx);
      props.onChange(mergeRects(props.value, normalized.print, normalized.safe));
    },
    [props.onChange, props.value, templateHeightPx, templateWidthPx],
  );

  if (!props.imageUrl) {
    return (
      <div className="rounded-2xl border border-dashed border-surface-borderSoft bg-brand-bg/40 p-6 text-sm text-brand-muted">
        Upload a base image on the mockup template before defining print coordinates.
      </div>
    );
  }

  if (templateImage.error) {
    return (
      <div className="rounded-2xl border border-dashed border-surface-borderSoft bg-brand-bg/40 p-6 text-sm text-brand-muted">
        Could not load the mockup base image. Check that the template image is uploaded and publicly accessible.
      </div>
    );
  }

  if (!templateImage.image) {
    return <div className="rounded-2xl border border-surface-borderSoft bg-white p-6 text-sm text-brand-muted">Loading print area editor...</div>;
  }

  const printRect = toPrintRect(props.value);
  const safeRect = toSafeRect(props.value);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-surface-app p-1">
          {(["print", "safe"] as const).map((layer) => (
            <button
              key={layer}
              type="button"
              className={clsx(
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                activeLayer === layer ? "bg-brand-blue text-white shadow-blueGlow" : "text-brand-muted hover:text-brand-ink",
              )}
              onClick={() => setActiveLayer(layer)}
            >
              {layer === "print" ? "Print area" : "Safe zone"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => setStageScale((current) => Math.max(0.1, current - 0.1))} aria-label="Zoom out">
            <ZoomOut size={16} />
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setStageScale((current) => Math.min(2.5, current + 0.1))} aria-label="Zoom in">
            <ZoomIn size={16} />
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={fitToViewport}>
            <Maximize2 size={16} /> Fit
          </Button>
        </div>
      </div>
      <div ref={containerRef} className="overflow-hidden rounded-2xl border border-surface-borderSoft bg-[#E8EBF8]">
        <Stage
          width={viewport.width}
          height={viewport.height}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePosition.x}
          y={stagePosition.y}
          draggable
          onDragEnd={(event) => setStagePosition({ x: event.target.x(), y: event.target.y() })}
        >
          <Layer>
            <KonvaImage image={templateImage.image} x={0} y={0} width={templateWidthPx} height={templateHeightPx} listening={false} />
            <RectEditorNode
              rect={printRect}
              active={activeLayer === "print"}
              stroke="#788AE0"
              fill={activeLayer === "print" ? "rgba(120, 138, 224, 0.12)" : "rgba(120, 138, 224, 0.04)"}
              onChange={(nextPrint) => emitChange(nextPrint, safeRect)}
            />
            <RectEditorNode
              rect={safeRect}
              active={activeLayer === "safe"}
              stroke="#F39E7C"
              fill={activeLayer === "safe" ? "rgba(243, 158, 124, 0.12)" : "rgba(243, 158, 124, 0.04)"}
              onChange={(nextSafe) => emitChange(printRect, nextSafe)}
            />
          </Layer>
        </Stage>
      </div>
      <p className="text-xs text-brand-muted">
        Select a layer, then drag or resize its rectangle on the mockup. Coordinates sync to the fields below in template pixel space (
        {templateWidthPx}×{templateHeightPx}px).
      </p>
    </div>
  );
}
