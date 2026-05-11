"use client";

import * as React from "react";
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";

export interface MotionProviderProps {
  children: React.ReactNode;
  /**
   * When set to "user" Framer Motion automatically honours
   * `prefers-reduced-motion` and disables transforms for users who
   * opted in to reduced motion. This is required for WCAG compliance
   * (Skill rule §1 `reduced-motion`).
   */
  reducedMotion?: "user" | "always" | "never";
}

/**
 * Wrap an app tree in MotionProvider so every Framer Motion component
 * respects the user's reduced-motion preference and benefits from
 * `LazyMotion` tree-shaking.
 */
export function MotionProvider({
  children,
  reducedMotion = "user",
}: MotionProviderProps) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>
    </LazyMotion>
  );
}
