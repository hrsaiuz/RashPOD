"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { PrintAreaVisualEditor as PrintAreaVisualEditorType } from "./PrintAreaVisualEditor";

export const PrintAreaVisualEditor = dynamic(
  () => import("./PrintAreaVisualEditor").then((mod) => mod.PrintAreaVisualEditor),
  {
    ssr: false,
    loading: () => <div className="rounded-2xl border border-surface-borderSoft bg-white p-6 text-sm text-brand-muted">Loading print area editor...</div>,
  },
) as typeof PrintAreaVisualEditorType;

export type PrintAreaVisualEditorProps = ComponentProps<typeof PrintAreaVisualEditorType>;
