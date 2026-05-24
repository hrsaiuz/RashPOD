import type { EditorPlacementState, PlacementConstraints, PrintAreaRect } from "@rashpod/mockup";

export interface MockupEditorContextResponse {
  templateWidthPx: number;
  templateHeightPx: number;
  templateImageUrl: string | null;
  designImageUrl: string | null;
  printArea: PrintAreaRect;
  constraints: PlacementConstraints;
  initialPlacement: EditorPlacementState;
  preset: { id: string; name: string; alignment?: unknown };
}

export type { EditorPlacementState, PlacementConstraints, PrintAreaRect };
