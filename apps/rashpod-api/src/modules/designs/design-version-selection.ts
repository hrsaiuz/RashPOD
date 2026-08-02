export function selectPrimaryDesignVersion<T extends { placement?: unknown }>(versions: T[]): T | undefined {
  return versions.find((version) => version.placement === "FRONT")
    ?? versions.find((version) => version.placement == null)
    ?? versions[0];
}
