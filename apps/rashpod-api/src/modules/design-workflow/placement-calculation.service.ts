import { BadRequestException, Injectable } from "@nestjs/common";
import {
  calculateLocalPosition,
  calculatePrintfulPosition,
  convertCmToIn,
  convertInToCm,
  validatePrintAreaConstraints,
  validatePositionWithinArea,
  type NormalizedPosition,
  type PositionInput,
  type PrintableAreaBounds,
  PlacementValidationError,
} from "@rashpod/mockup";

export type { PositionInput, PrintableAreaBounds, NormalizedPosition };

@Injectable()
export class PlacementCalculationService {
  convertCmToIn(value: number) {
    return convertCmToIn(value);
  }

  convertInToCm(value: number) {
    return convertInToCm(value);
  }

  calculateLocalPosition(position: PositionInput): NormalizedPosition {
    return calculateLocalPosition(position);
  }

  calculatePrintfulPosition(position: PositionInput): NormalizedPosition {
    return calculatePrintfulPosition(position);
  }

  validatePositionWithinArea(position: NormalizedPosition, bounds: PrintableAreaBounds, units: "CM" | "INCH" | "PX") {
    try {
      return validatePositionWithinArea(position, bounds, units);
    } catch (error) {
      if (error instanceof PlacementValidationError) throw new BadRequestException(error.message);
      throw error;
    }
  }

  validatePrintAreaConstraints(position: NormalizedPosition, bounds: PrintableAreaBounds, units: "CM" | "INCH" | "PX") {
    try {
      return validatePrintAreaConstraints(position, bounds, units);
    } catch (error) {
      if (error instanceof PlacementValidationError) throw new BadRequestException(error.message);
      throw error;
    }
  }
}
