export type PackItemInput = {
  id: string;
  widthCm: number;
  heightCm: number;
  quantity?: number;
  locked?: boolean;
  xCm?: number;
  yCm?: number;
  rotation?: number;
};

export type PackSheetInput = {
  widthCm: number;
  heightCm: number;
  marginCm: number;
  gapCm: number;
  allowRotate?: boolean;
  items: PackItemInput[];
};

export type PackedItem = PackItemInput & {
  copyIndex: number;
  xCm: number;
  yCm: number;
  rotation: number;
  placed: boolean;
};

export function autoArrangeGangSheet(input: PackSheetInput) {
  const margin = Math.max(0, input.marginCm || 0);
  const gap = Math.max(0, input.gapCm || 0);
  const maxX = input.widthCm - margin;
  const maxY = input.heightCm - margin;
  const printableWidth = Math.max(0, input.widthCm - margin * 2);
  const printableHeight = Math.max(0, input.heightCm - margin * 2);
  const expanded = input.items.flatMap((item) => {
    const copies = Math.max(1, Math.trunc(item.quantity ?? 1));
    return Array.from({ length: copies }, (_unused, copyIndex) => ({ ...item, copyIndex }));
  });
  const locked = expanded.filter((item) => item.locked && item.xCm != null && item.yCm != null).map((item) => ({ ...item, xCm: item.xCm!, yCm: item.yCm!, rotation: item.rotation ?? 0, placed: true }));
  const candidates = expanded
    .filter((item) => !(item.locked && item.xCm != null && item.yCm != null))
    .sort((left, right) => Math.max(right.heightCm, right.widthCm) - Math.max(left.heightCm, left.widthCm) || right.widthCm * right.heightCm - left.widthCm * left.heightCm || left.id.localeCompare(right.id) || left.copyIndex - right.copyIndex);

  const placed: PackedItem[] = [...locked];
  const unplaced: PackedItem[] = [];
  let cursorX = margin;
  let cursorY = margin;
  let shelfHeight = 0;

  for (const item of candidates) {
    const rotated = Boolean(input.allowRotate && item.heightCm <= printableWidth && item.widthCm <= printableHeight && item.heightCm < item.widthCm);
    const width = rotated ? item.heightCm : item.widthCm;
    const height = rotated ? item.widthCm : item.heightCm;
    if (width > printableWidth || height > printableHeight) {
      unplaced.push({ ...item, xCm: cursorX, yCm: cursorY, rotation: rotated ? 90 : 0, placed: false });
      continue;
    }
    if (cursorX + width > maxX) {
      cursorX = margin;
      cursorY += shelfHeight + gap;
      shelfHeight = 0;
    }
    if (cursorY + height > maxY) {
      unplaced.push({ ...item, xCm: cursorX, yCm: cursorY, rotation: rotated ? 90 : 0, placed: false });
      continue;
    }
    placed.push({ ...item, xCm: roundCm(cursorX), yCm: roundCm(cursorY), widthCm: item.widthCm, heightCm: item.heightCm, rotation: rotated ? 90 : 0, placed: true });
    cursorX += width + gap;
    shelfHeight = Math.max(shelfHeight, height);
  }

  const usedAreaCm2 = roundCm(placed.reduce((sum, item) => sum + item.widthCm * item.heightCm, 0));
  const printableAreaCm2 = roundCm(printableWidth * printableHeight);
  const wasteAreaCm2 = roundCm(Math.max(0, printableAreaCm2 - usedAreaCm2));
  const utilizationPercent = printableAreaCm2 > 0 ? roundCm((usedAreaCm2 / printableAreaCm2) * 100) : 0;
  const warnings = unplaced.length ? [`${unplaced.length} item copies could not be placed`] : [];
  return { placed, unplaced, usedAreaCm2, printableAreaCm2, wasteAreaCm2, utilizationPercent, warnings };
}

export function roundCm(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function rectanglesOverlap(left: { xCm: number; yCm: number; widthCm: number; heightCm: number }, right: { xCm: number; yCm: number; widthCm: number; heightCm: number }) {
  return left.xCm < right.xCm + right.widthCm && left.xCm + left.widthCm > right.xCm && left.yCm < right.yCm + right.heightCm && left.yCm + left.heightCm > right.yCm;
}
