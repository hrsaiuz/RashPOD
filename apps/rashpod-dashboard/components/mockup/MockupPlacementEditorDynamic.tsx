"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { MockupPlacementEditor as MockupPlacementEditorType } from "./MockupPlacementEditor";

export const MockupPlacementEditor = dynamic(
  () => import("./MockupPlacementEditor").then((mod) => mod.MockupPlacementEditor),
  {
    ssr: false,
    loading: () => <div className="rounded-2xl border border-surface-borderSoft bg-white p-6 text-sm text-brand-muted">Loading mockup editor...</div>,
  },
) as typeof MockupPlacementEditorType;

export type MockupPlacementEditorProps = ComponentProps<typeof MockupPlacementEditorType>;
