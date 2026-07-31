export type ModeratorPrintArea = {
  id: string;
  mockupTemplateId: string;
  defaultPresetId?: string | null;
  placement?: string | null;
  isActive?: boolean;
  mockupView?: { isActive?: boolean } | null;
};

export function moderatorPrintAreasForTemplate<T extends ModeratorPrintArea>(areas: T[], templateId: string): T[] {
  return areas.filter((area) => (
    area.mockupTemplateId === templateId
    && area.isActive !== false
    && area.mockupView?.isActive !== false
  ));
}

export function preferredAreaForPreset<T extends ModeratorPrintArea>(
  areas: T[],
  preset: { id: string; placement?: string | null } | undefined,
  currentAreaId?: string,
): T | undefined {
  return areas.find((area) => area.defaultPresetId === preset?.id)
    ?? areas.find((area) => !preset || !area.placement || area.placement === preset.placement)
    ?? areas.find((area) => area.id === currentAreaId)
    ?? areas[0];
}
