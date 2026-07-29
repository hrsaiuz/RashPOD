-- Local print areas and safe zones are sufficient to define a valid placement.
-- Presets remain optional shortcuts for default position and sizing.
ALTER TABLE "DesignProductSelection"
ALTER COLUMN "placementPresetId" DROP NOT NULL;
