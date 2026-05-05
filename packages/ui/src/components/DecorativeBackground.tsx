"use client";

import * as React from "react";
import { motion } from "framer-motion";

// In the future, these can be fetched from the Admin Media Library API
const MOCK_ASSETS = [
  "M 10 10 L 90 10 L 50 90 Z", // Triangle
  "M 10 50 A 40 40 0 1 0 90 50 A 40 40 0 1 0 10 50", // Circle
  "M 10 10 L 90 10 L 90 90 L 10 90 Z", // Square
];

const COLORS = ["#788AE0", "#A3AFE5", "#CFD6FA", "#F39E7C", "#EBB7A2", "#FFD6C6"];

export function DecorativeBackground() {
  const [shapes, setShapes] = React.useState<{ path: string, color: string, x: number, y: number, size: number, delay: number }[]>([]);

  React.useEffect(() => {
    // Generate random shapes on client to avoid hydration mismatch
    const generated = Array.from({ length: 15 }).map(() => ({
      path: MOCK_ASSETS[Math.floor(Math.random() * MOCK_ASSETS.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 60 + 20,
      delay: Math.random() * 5,
    }));
    setShapes(generated);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
      {shapes.map((shape, i) => (
        <motion.div
          key={i}
          className="absolute opacity-[0.18]"
          style={{
            left: `${shape.x}%`,
            top: `${shape.y}%`,
            width: shape.size,
            height: shape.size,
          }}
          animate={{
            y: [0, -30, 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: shape.delay,
          }}
        >
          <svg viewBox="0 0 100 100" width="100%" height="100%" fill={shape.color}>
            <path d={shape.path} />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}
