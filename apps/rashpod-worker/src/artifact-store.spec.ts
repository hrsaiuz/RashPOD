import * as path from "path";
import { resolveLocalArtifactPath } from "./artifact-store";

describe("local artifact path containment", () => {
  const root = path.resolve("local-assets-test");

  it("resolves a normal object key beneath the configured root", () => {
    expect(resolveLocalArtifactPath(root, "pipeline-mockups/selection/main.png"))
      .toBe(path.join(root, "pipeline-mockups", "selection", "main.png"));
  });

  it.each(["../secret.txt", "nested/../../secret.txt"])("rejects traversal key %s", (objectKey) => {
    expect(() => resolveLocalArtifactPath(root, objectKey)).toThrow("Invalid local artifact key");
  });

  it("rejects absolute object keys", () => {
    expect(() => resolveLocalArtifactPath(root, path.resolve("outside.png"))).toThrow("Invalid local artifact key");
  });
});
