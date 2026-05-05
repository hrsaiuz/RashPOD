export function canReadFile(input: { isPublic: boolean; ownerId: string; actorId: string }): boolean {
  return input.isPublic || input.ownerId === input.actorId;
}
