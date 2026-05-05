import { canReadFile } from "../src/modules/files/file-policy";

describe("canReadFile", () => {
  it("allows owner to read private file", () => {
    expect(canReadFile({ isPublic: false, ownerId: "u1", actorId: "u1" })).toBe(true);
  });

  it("denies non-owner for private file", () => {
    expect(canReadFile({ isPublic: false, ownerId: "u1", actorId: "u2" })).toBe(false);
  });

  it("allows any actor for public file", () => {
    expect(canReadFile({ isPublic: true, ownerId: "u1", actorId: "u2" })).toBe(true);
  });
});
