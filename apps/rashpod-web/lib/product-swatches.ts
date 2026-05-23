/** Product color swatch values — hex/gradients are intentional sample data, not UI tokens. */
export const COLOR_SWATCHES = [
  { label: "Peach", value: "#ead7c5" },
  { label: "Lime", value: "#bfd676" },
  { label: "Periwinkle", value: "#aab4f6" },
  { label: "Pink", value: "#f5c2ea" },
  { label: "Sage", value: "linear-gradient(180deg, #e1bda8 0 49%, #9cac7c 50% 100%)" },
] as const;

export function swatchStyle(value: string) {
  return { background: value };
}
