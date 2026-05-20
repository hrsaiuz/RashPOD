import { BadRequestException, Injectable } from "@nestjs/common";

export interface PositionInput {
  width?: number;
  height?: number;
  widthCm?: number;
  heightCm?: number;
  widthIn?: number;
  heightIn?: number;
  x?: number;
  y?: number;
  xCm?: number;
  yCm?: number;
  left?: number;
  top?: number;
  leftIn?: number;
  topIn?: number;
  scale?: number;
  rotation?: number;
}

export interface PrintableAreaBounds {
  widthPx?: number | null;
  heightPx?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  widthIn?: number | null;
  heightIn?: number | null;
}

export interface NormalizedPosition {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  left?: number;
  top?: number;
  scale: number;
  rotation: number;
}

@Injectable()
export class PlacementCalculationService {
  convertCmToIn(value: number) {
    return this.round(value / 2.54);
  }

  convertInToCm(value: number) {
    return this.round(value * 2.54);
  }

  calculateLocalPosition(position: PositionInput): NormalizedPosition {
    const width = position.widthCm ?? position.width;
    const height = position.heightCm ?? position.height;
    const x = position.xCm ?? position.x;
    const y = position.yCm ?? position.y;
    return {
      width,
      height,
      x,
      y,
      scale: position.scale ?? 1,
      rotation: position.rotation ?? 0,
    };
  }

  calculatePrintfulPosition(position: PositionInput): NormalizedPosition {
    const width = position.widthIn ?? (position.widthCm == null ? position.width : this.convertCmToIn(position.widthCm));
    const height = position.heightIn ?? (position.heightCm == null ? position.height : this.convertCmToIn(position.heightCm));
    const left = position.leftIn ?? (position.left == null ? undefined : position.left);
    const top = position.topIn ?? (position.top == null ? undefined : position.top);
    return {
      width,
      height,
      left: left ?? (position.xCm == null ? position.x : this.convertCmToIn(position.xCm)),
      top: top ?? (position.yCm == null ? position.y : this.convertCmToIn(position.yCm)),
      scale: position.scale ?? 1,
      rotation: position.rotation ?? 0,
    };
  }

  validatePositionWithinArea(position: NormalizedPosition, bounds: PrintableAreaBounds, units: "CM" | "INCH" | "PX") {
    const width = position.width ?? 0;
    const height = position.height ?? 0;
    const x = position.x ?? position.left ?? 0;
    const y = position.y ?? position.top ?? 0;
    const areaWidth = units === "CM" ? bounds.widthCm : units === "INCH" ? bounds.widthIn : bounds.widthPx;
    const areaHeight = units === "CM" ? bounds.heightCm : units === "INCH" ? bounds.heightIn : bounds.heightPx;

    if (width <= 0 || height <= 0) throw new BadRequestException("INVALID_PLACEMENT: width and height are required");
    if (x < 0 || y < 0) throw new BadRequestException("POSITION_OUTSIDE_PRINT_AREA");
    if (areaWidth != null && x + width > areaWidth) throw new BadRequestException("POSITION_OUTSIDE_PRINT_AREA");
    if (areaHeight != null && y + height > areaHeight) throw new BadRequestException("POSITION_OUTSIDE_PRINT_AREA");
    return true;
  }

  private round(value: number) {
    return Math.round(value * 100) / 100;
  }
}
