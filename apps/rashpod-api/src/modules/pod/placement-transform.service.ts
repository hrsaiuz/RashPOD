import { BadRequestException, Injectable } from "@nestjs/common";
import { PlacementUnits } from "@prisma/client";
import { createHash } from "crypto";

type TransformInput = {
  position: {
    width?: number | null;
    height?: number | null;
    x?: number | null;
    y?: number | null;
    left?: number | null;
    top?: number | null;
    scale?: number | null;
    rotation?: number | null;
    units?: PlacementUnits | null;
  };
  localPrintArea: {
    id: string;
    width: number;
    height: number;
    widthCm?: number | null;
    heightCm?: number | null;
    safeX: number;
    safeY: number;
    safeWidth: number;
    safeHeight: number;
  };
  mapping: {
    id: string;
    providerUnits: PlacementUnits;
    providerDpi?: number | null;
    providerWidth?: number | null;
    providerHeight?: number | null;
    offsetX: number;
    offsetY: number;
    supportsRotation: boolean;
    minScale?: number | null;
    maxScale?: number | null;
    providerPlacement?: string | null;
    technique?: string | null;
  };
};

@Injectable()
export class PodPlacementTransformService {
  transform(input: TransformInput) {
    const rotation = input.position.rotation ?? 0;
    if (rotation !== 0 && !input.mapping.supportsRotation) throw new BadRequestException("POD_TRANSFORM_BLOCKED: rotation is not supported by provider print area");
    const scale = input.position.scale ?? 1;
    if (input.mapping.minScale != null && scale < input.mapping.minScale) throw new BadRequestException("POD_TRANSFORM_BLOCKED: scale below provider minimum");
    if (input.mapping.maxScale != null && scale > input.mapping.maxScale) throw new BadRequestException("POD_TRANSFORM_BLOCKED: scale above provider maximum");

    const providerWidth = input.mapping.providerWidth;
    const providerHeight = input.mapping.providerHeight;
    if (!providerWidth || !providerHeight) throw new BadRequestException("POD_TRANSFORM_BLOCKED: provider print area dimensions are required");

    const sourceUnits = input.position.units ?? PlacementUnits.PX;
    const sourceWidth = input.position.width ?? 0;
    const sourceHeight = input.position.height ?? 0;
    const sourceX = input.position.x ?? input.position.left ?? 0;
    const sourceY = input.position.y ?? input.position.top ?? 0;
    if (sourceWidth <= 0 || sourceHeight <= 0) throw new BadRequestException("POD_TRANSFORM_BLOCKED: width and height are required");

    const localWidth = this.localAreaWidth(input.localPrintArea, sourceUnits);
    const localHeight = this.localAreaHeight(input.localPrintArea, sourceUnits);
    if (!localWidth || !localHeight) throw new BadRequestException("POD_TRANSFORM_BLOCKED: local print area dimensions are required for selected units");

    const widthRatio = sourceWidth / localWidth;
    const heightRatio = sourceHeight / localHeight;
    const xRatio = sourceX / localWidth;
    const yRatio = sourceY / localHeight;
    const width = this.round(providerWidth * widthRatio);
    const height = this.round(providerHeight * heightRatio);
    const x = this.round(input.mapping.offsetX + providerWidth * xRatio);
    const y = this.round(input.mapping.offsetY + providerHeight * yRatio);

    if (x < 0 || y < 0 || x + width > providerWidth + input.mapping.offsetX || y + height > providerHeight + input.mapping.offsetY) {
      throw new BadRequestException("POD_TRANSFORM_BLOCKED: placement is outside provider print area");
    }

    const payload = {
      version: 1,
      providerPlacement: input.mapping.providerPlacement,
      technique: input.mapping.technique,
      units: input.mapping.providerUnits,
      printAreaMappingId: input.mapping.id,
      position: { width, height, x, y, left: x, top: y, scale, rotation },
      ratios: {
        width: this.round(widthRatio),
        height: this.round(heightRatio),
        x: this.round(xRatio),
        y: this.round(yRatio),
      },
    };
    return {
      payload,
      placementHash: createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 32),
    };
  }

  private localAreaWidth(area: TransformInput["localPrintArea"], units: PlacementUnits) {
    if (units === PlacementUnits.CM) return area.widthCm;
    return area.width;
  }

  private localAreaHeight(area: TransformInput["localPrintArea"], units: PlacementUnits) {
    if (units === PlacementUnits.CM) return area.heightCm;
    return area.height;
  }

  private round(value: number) {
    return Math.round(value * 10000) / 10000;
  }
}
